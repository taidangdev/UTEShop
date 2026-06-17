const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

const STATUS_LABELS = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Chuẩn bị hàng',
    shipping: 'Đang giao',
    delivery_failed: 'Giao thất bại',
    delivered: 'Đã giao',
    returned: 'Hoàn trả hàng',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền'
};

const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipping',
    'delivery_failed',
    'delivered',
    'returned',
    'cancelled',
    'refunded'
];

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function parseDateInput(value) {
    if (!value || typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function subtractDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() - days);
    return d;
}

function buildDateRange({ from, to, preset }) {
    const now = new Date();
    const parsedTo = parseDateInput(to);
    const parsedFrom = parseDateInput(from);

    const presetDaysMap = {
        '7d': 7,
        '30d': 30,
        '90d': 90,
        '365d': 365
    };
    const presetDays = presetDaysMap[preset] || 30;

    const endDate = endOfDay(parsedTo || now);
    let startDate = startOfDay(parsedFrom || subtractDays(endDate, presetDays - 1));

    if (startDate > endDate) {
        startDate = startOfDay(subtractDays(endDate, 29));
    }

    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;

    return {
        startDate,
        endDate,
        diffDays
    };
}

function buildTimelineBuckets(startDate, endDate, groupBy) {
    const buckets = [];
    const cursor = new Date(startDate);

    if (groupBy === 'month') {
        cursor.setDate(1);
        while (cursor <= endDate) {
            const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-01`;
            buckets.push(key);
            cursor.setMonth(cursor.getMonth() + 1, 1);
        }
        return buckets;
    }

    while (cursor <= endDate) {
        const key = cursor.toISOString().slice(0, 10);
        buckets.push(key);
        cursor.setDate(cursor.getDate() + 1);
    }
    return buckets;
}

function toNumber(value) {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
}

async function getAdminDashboardStats({ from, to, preset, groupBy, status }) {
    const { startDate, endDate, diffDays } = buildDateRange({ from, to, preset });
    const timelineGroupBy = groupBy === 'month' ? 'month' : diffDays > 60 ? 'month' : 'day';

    const replacements = {
        startDate,
        endDate
    };

    const overviewRows = await sequelize.query(
        `
        SELECT
            COUNT(*) AS totalOrders,
            COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.total ELSE 0 END), 0) AS totalRevenue,
            COALESCE(SUM(CASE WHEN o.status = 'shipping' THEN o.total ELSE 0 END), 0) AS shippingValue,
            COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total ELSE 0 END), 0) AS deliveredValue
        FROM orders o
        WHERE o.placedAt BETWEEN :startDate AND :endDate
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const customerRows = await sequelize.query(
        `
        SELECT COUNT(*) AS newCustomers
        FROM users u
        WHERE u.role = 'customer'
          AND u.createdAt BETWEEN :startDate AND :endDate
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const statusRows = await sequelize.query(
        `
        SELECT o.status, COUNT(*) AS count
        FROM orders o
        WHERE o.placedAt BETWEEN :startDate AND :endDate
        GROUP BY o.status
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const ordersRows = await sequelize.query(
        `
        SELECT
            o.id,
            o.orderNumber,
            o.status,
            o.total,
            o.placedAt,
            o.deliveredAt,
            o.shippingSnapshot,
            p.method AS paymentMethod,
            p.status AS paymentStatus,
            COALESCE(u.fullName, u.username, o.guestEmail, 'Guest') AS customerName
        FROM orders o
        LEFT JOIN users u ON u.id = o.userId
        LEFT JOIN payments p ON p.orderId = o.id
        WHERE o.placedAt BETWEEN :startDate AND :endDate
        ORDER BY o.placedAt DESC
        LIMIT 200
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const revenueBucketExpr =
        timelineGroupBy === 'month'
            ? "DATE_FORMAT(o.placedAt, '%Y-%m-01')"
            : 'DATE(o.placedAt)';
    const revenueRows = await sequelize.query(
        `
        SELECT
            ${revenueBucketExpr} AS bucket,
            COUNT(*) AS orderCount,
            COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled', 'refunded') THEN o.total ELSE 0 END), 0) AS revenue
        FROM orders o
        WHERE o.placedAt BETWEEN :startDate AND :endDate
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const cashflowRows = await sequelize.query(
        `
        SELECT
            o.status,
            COUNT(*) AS orderCount,
            COALESCE(SUM(o.total), 0) AS amount
        FROM orders o
        WHERE o.placedAt BETWEEN :startDate AND :endDate
          AND o.status IN ('shipping', 'delivered')
        GROUP BY o.status
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const topProductRows = await sequelize.query(
        `
        SELECT
            oi.productId,
            COALESCE(p.name, oi.productName) AS productName,
            SUM(oi.quantity) AS totalQuantity,
            COALESCE(SUM(oi.lineTotal - COALESCE(oi.discountAmount, 0)), 0) AS totalRevenue,
            COUNT(DISTINCT oi.orderId) AS orderCount
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.orderId
        LEFT JOIN products p ON p.id = oi.productId
        WHERE o.placedAt BETWEEN :startDate AND :endDate
          AND o.status NOT IN ('cancelled', 'refunded')
        GROUP BY oi.productId, productName
        ORDER BY totalQuantity DESC, totalRevenue DESC
        LIMIT 10
        `,
        { replacements, type: QueryTypes.SELECT }
    );

    const selectedStatus = ORDER_STATUSES.includes(status) ? status : 'all';
    const normalizedOrders = ordersRows.map((row) => {
        const snapshot = row.shippingSnapshot || {};
        return {
            id: row.id,
            orderNumber: row.orderNumber,
            status: row.status,
            statusLabel: STATUS_LABELS[row.status] || row.status,
            customerName: row.customerName,
            total: toNumber(row.total),
            paymentMethod: row.paymentMethod || null,
            paymentStatus: row.paymentStatus || null,
            placedAt: row.placedAt,
            deliveredAt: row.deliveredAt,
            deliveryType: snapshot.deliveryType || null
        };
    });

    const countsByStatus = ORDER_STATUSES.reduce((acc, key) => {
        acc[key] = 0;
        return acc;
    }, {});
    for (const row of statusRows) {
        if (countsByStatus[row.status] != null) {
            countsByStatus[row.status] = Number(row.count);
        }
    }

    const groupedOrders = ORDER_STATUSES.reduce((acc, currentStatus) => {
        acc[currentStatus] = normalizedOrders
            .filter((item) => item.status === currentStatus)
            .slice(0, 20);
        return acc;
    }, {});

    const activeOrders =
        selectedStatus === 'all'
            ? normalizedOrders.slice(0, 30)
            : groupedOrders[selectedStatus] || [];

    const timelineBuckets = buildTimelineBuckets(startDate, endDate, timelineGroupBy);
    const revenueByBucket = {};
    for (const row of revenueRows) {
        const bucket = String(row.bucket).slice(0, 10);
        revenueByBucket[bucket] = {
            revenue: toNumber(row.revenue),
            orderCount: Number(row.orderCount)
        };
    }
    const revenueSeries = timelineBuckets.map((bucket) => ({
        bucket,
        revenue: revenueByBucket[bucket]?.revenue || 0,
        orderCount: revenueByBucket[bucket]?.orderCount || 0
    }));

    const cashflow = {
        shippingAmount: 0,
        deliveredAmount: 0,
        shippingOrders: 0,
        deliveredOrders: 0
    };
    for (const row of cashflowRows) {
        if (row.status === 'shipping') {
            cashflow.shippingAmount = toNumber(row.amount);
            cashflow.shippingOrders = Number(row.orderCount);
        }
        if (row.status === 'delivered') {
            cashflow.deliveredAmount = toNumber(row.amount);
            cashflow.deliveredOrders = Number(row.orderCount);
        }
    }

    const overview = overviewRows[0] || {};
    const newCustomers = customerRows[0] || {};

    return {
        range: {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
            groupBy: timelineGroupBy,
            selectedStatus
        },
        overview: {
            totalOrders: Number(overview.totalOrders || 0),
            totalRevenue: toNumber(overview.totalRevenue),
            shippingValue: toNumber(overview.shippingValue),
            deliveredValue: toNumber(overview.deliveredValue),
            newCustomers: Number(newCustomers.newCustomers || 0)
        },
        orderStats: {
            total: Number(overview.totalOrders || 0),
            byStatus: ORDER_STATUSES.map((orderStatus) => ({
                status: orderStatus,
                label: STATUS_LABELS[orderStatus],
                count: countsByStatus[orderStatus] || 0
            })),
            orders: activeOrders,
            groupedOrders
        },
        cashflow: {
            inTransitAmount: cashflow.shippingAmount,
            settledAmount: cashflow.deliveredAmount,
            inTransitOrders: cashflow.shippingOrders,
            settledOrders: cashflow.deliveredOrders,
            shippingOrders: groupedOrders.shipping || [],
            deliveredOrders: groupedOrders.delivered || []
        },
        revenueSeries,
        topProducts: topProductRows.map((row, index) => ({
            rank: index + 1,
            productId: row.productId,
            productName: row.productName || `Sản phẩm #${row.productId}`,
            totalQuantity: Number(row.totalQuantity || 0),
            totalRevenue: toNumber(row.totalRevenue),
            orderCount: Number(row.orderCount || 0)
        }))
    };
}

module.exports = {
    getAdminDashboardStats,
    STATUS_LABELS,
    ORDER_STATUSES
};

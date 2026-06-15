const { Op } = require('sequelize');
const sequelize = require('../config/db');
const {
    Order,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    User
} = require('../models');
const { STATUS_LABELS, ORDER_STATUSES } = require('./adminDashboard.service');
const notificationService = require('./notification.service');

const ADMIN_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled', 'refunded'],
    processing: ['shipping', 'cancelled'],
    shipping: ['delivered'],
    delivered: [],
    cancelled: [],
    refunded: []
};

const STATUS_NOTIFICATIONS = {
    confirmed: {
        title: '✅ Đơn hàng đã được xác nhận',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} của bạn đã được xác nhận và đang được xử lý.`
    },
    processing: {
        title: '📦 Đơn hàng đang được chuẩn bị',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} đang được chuẩn bị để giao cho bạn.`
    },
    shipping: {
        title: '🚚 Đơn hàng đang được giao',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} đã được giao cho đơn vị vận chuyển.`
    },
    delivered: {
        title: '🎉 Đơn hàng đã giao thành công',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} đã được giao thành công. Cảm ơn bạn đã mua sắm!`
    },
    cancelled: {
        title: '❌ Đơn hàng đã bị hủy',
        content: (orderNumber) => `Đơn hàng ${orderNumber} đã được hủy.`
    },
    refunded: {
        title: '💸 Đơn hàng đã được hoàn tiền',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} đã được hủy và chuyển trạng thái hoàn tiền.`
    }
};

function toNumber(value) {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
}

function parseDateInput(value) {
    if (!value || typeof value !== 'string') return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function getAllowedNextStatuses(currentStatus) {
    return ADMIN_TRANSITIONS[currentStatus] || [];
}

function mapAdminOrderRow(order) {
    const snapshot = order.shippingSnapshot || {};
    const user = order.user;
    const customerName =
        user?.fullName || user?.username || order.guestEmail || snapshot.fullName || 'Guest';
    const customerEmail = user?.email || order.guestEmail || null;
    const customerPhone = order.guestPhone || snapshot.phone || user?.phone || null;

    return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: STATUS_LABELS[order.status] || order.status,
        customerName,
        customerEmail,
        customerPhone,
        total: toNumber(order.total),
        subtotal: toNumber(order.subtotal),
        discountAmount: toNumber(order.discountAmount),
        shippingFee: toNumber(order.shippingFee),
        paymentMethod: order.payment?.method || null,
        paymentStatus: order.payment?.status || null,
        placedAt: order.placedAt,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        deliveryType: snapshot.deliveryType || null,
        itemCount: order.items?.length || 0,
        allowedNextStatuses: getAllowedNextStatuses(order.status).map((status) => ({
            status,
            label: STATUS_LABELS[status] || status
        }))
    };
}

function mapAdminOrderDetail(order) {
    const snapshot = order.shippingSnapshot || {};
    const user = order.user;

    return {
        ...mapAdminOrderRow(order),
        userId: order.userId,
        guestEmail: order.guestEmail,
        guestPhone: order.guestPhone,
        note: order.note,
        adminNote: order.adminNote || null,
        promotionCode: order.promotionCode,
        shippingSnapshot: snapshot,
        items: (order.items || []).map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: toNumber(item.unitPrice),
            lineTotal: toNumber(item.lineTotal),
            discountAmount: toNumber(item.discountAmount ?? 0),
            promotionId: item.promotionId ?? null
        })),
        payment: order.payment
            ? {
                  method: order.payment.method,
                  status: order.payment.status,
                  amount: toNumber(order.payment.amount),
                  paidAt: order.payment.paidAt,
                  transactionRef: order.payment.transactionRef || null
              }
            : null
    };
}

async function incrementStock(line, transaction) {
    if (line.variantId) {
        const variant = await ProductVariant.findByPk(line.variantId, { transaction });
        if (!variant) return;
        await variant.update(
            { stockQuantity: variant.stockQuantity + line.quantity },
            { transaction }
        );
        return;
    }

    const product = await Product.findByPk(line.productId, { transaction });
    if (!product) return;

    const nextStock = product.stockQuantity + line.quantity;
    const updates = { stockQuantity: nextStock };
    if (product.status === 'out_of_stock' && nextStock > 0) {
        updates.status = 'active';
    }
    await product.update(updates, { transaction });
}

async function listOrders({
    page = 1,
    limit = 20,
    status,
    search,
    from,
    to
} = {}) {
    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (safePage - 1) * safeLimit;

    const where = {};

    if (ORDER_STATUSES.includes(status)) {
        where.status = status;
    }

    const parsedFrom = parseDateInput(from);
    const parsedTo = parseDateInput(to);
    if (parsedFrom || parsedTo) {
        where.placedAt = {};
        if (parsedFrom) {
            const start = new Date(parsedFrom);
            start.setHours(0, 0, 0, 0);
            where.placedAt[Op.gte] = start;
        }
        if (parsedTo) {
            const end = new Date(parsedTo);
            end.setHours(23, 59, 59, 999);
            where.placedAt[Op.lte] = end;
        }
    }

    const searchTerm = String(search || '').trim();
    if (searchTerm) {
        where[Op.or] = [
            { orderNumber: { [Op.like]: `%${searchTerm}%` } },
            { guestEmail: { [Op.like]: `%${searchTerm}%` } },
            { guestPhone: { [Op.like]: `%${searchTerm}%` } },
            { '$user.fullName$': { [Op.like]: `%${searchTerm}%` } },
            { '$user.email$': { [Op.like]: `%${searchTerm}%` } },
            { '$user.username$': { [Op.like]: `%${searchTerm}%` } }
        ];
    }

    const { rows, count } = await Order.findAndCountAll({
        where,
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'fullName', 'username', 'email', 'phone'],
                required: false
            },
            {
                model: Payment,
                as: 'payment',
                required: false
            },
            {
                model: OrderItem,
                as: 'items',
                attributes: ['id']
            }
        ],
        order: [['placedAt', 'DESC']],
        limit: safeLimit,
        offset,
        distinct: true
    });

    const statusCounts = await Order.findAll({
        attributes: [
            'status',
            [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
    });

    const countsByStatus = ORDER_STATUSES.reduce((acc, key) => {
        acc[key] = 0;
        return acc;
    }, {});
    for (const row of statusCounts) {
        if (countsByStatus[row.status] != null) {
            countsByStatus[row.status] = Number(row.count);
        }
    }

    return {
        orders: rows.map(mapAdminOrderRow),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total: count,
            totalPages: Math.max(1, Math.ceil(count / safeLimit))
        },
        statusCounts: ORDER_STATUSES.map((orderStatus) => ({
            status: orderStatus,
            label: STATUS_LABELS[orderStatus],
            count: countsByStatus[orderStatus] || 0
        }))
    };
}

async function getOrderDetail(orderNumber) {
    const order = await Order.findOne({
        where: { orderNumber },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'fullName', 'username', 'email', 'phone'],
                required: false
            },
            {
                model: OrderItem,
                as: 'items'
            },
            {
                model: Payment,
                as: 'payment',
                required: false
            }
        ]
    });

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    return { order: mapAdminOrderDetail(order) };
}

async function applyStatusSideEffects(order, payment, newStatus, transaction) {
    const now = new Date();
    const orderUpdates = { status: newStatus };

    if (newStatus === 'confirmed') {
        if (payment) {
            const onlineMethods = ['bank_transfer', 'momo', 'vnpay'];
            if (
                onlineMethods.includes(payment.method) &&
                payment.status === 'pending'
            ) {
                await payment.update({ status: 'paid', paidAt: now }, { transaction });
                orderUpdates.paidAt = now;
            }
        }
    }

    if (newStatus === 'shipping') {
        orderUpdates.shippedAt = now;
    }

    if (newStatus === 'delivered') {
        orderUpdates.deliveredAt = now;
        if (payment && payment.method === 'cod' && payment.status === 'pending') {
            await payment.update({ status: 'paid', paidAt: now }, { transaction });
            orderUpdates.paidAt = now;
        }
    }

    if (newStatus === 'cancelled' || newStatus === 'refunded') {
        orderUpdates.cancelledAt = now;
        if (payment) {
            const paymentStatus =
                newStatus === 'refunded' || payment.status === 'paid'
                    ? 'refunded'
                    : 'failed';
            await payment.update({ status: paymentStatus }, { transaction });
        }
    }

    await order.update(orderUpdates, { transaction });
}

async function updateOrderStatus(orderNumber, { status: newStatus, adminNote }) {
    const allowedStatuses = ORDER_STATUSES;
    if (!allowedStatuses.includes(newStatus)) {
        const err = new Error('Invalid order status');
        err.statusCode = 400;
        throw err;
    }

    const transaction = await sequelize.transaction();

    try {
        const order = await Order.findOne({
            where: { orderNumber },
            include: [
                { model: OrderItem, as: 'items' },
                { model: Payment, as: 'payment' },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'fullName'],
                    required: false
                }
            ],
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!order) {
            const err = new Error('Order not found');
            err.statusCode = 404;
            throw err;
        }

        const allowedNext = ADMIN_TRANSITIONS[order.status] || [];
        if (!allowedNext.includes(newStatus)) {
            const err = new Error(
                `Cannot transition from "${order.status}" to "${newStatus}"`
            );
            err.statusCode = 400;
            throw err;
        }

        const shouldRestoreStock = ['cancelled', 'refunded'].includes(newStatus);
        if (shouldRestoreStock) {
            for (const item of order.items) {
                await incrementStock(
                    {
                        productId: item.productId,
                        variantId: item.variantId,
                        quantity: item.quantity
                    },
                    transaction
                );
            }
        }

        if (adminNote !== undefined) {
            await order.update({ adminNote: adminNote || null }, { transaction });
        }

        await applyStatusSideEffects(order, order.payment, newStatus, transaction);

        await transaction.commit();

        const updated = await Order.findOne({
            where: { orderNumber },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'fullName', 'username', 'email', 'phone'],
                    required: false
                },
                { model: OrderItem, as: 'items' },
                { model: Payment, as: 'payment', required: false }
            ]
        });

        const notification = STATUS_NOTIFICATIONS[newStatus];
        if (notification && order.userId) {
            notificationService
                .createNotification({
                    userId: order.userId,
                    title: notification.title,
                    content: notification.content(orderNumber),
                    type: 'order_status_update',
                    relatedId: orderNumber
                })
                .catch((err) =>
                    console.error('Error sending admin status notification:', err)
                );
        }

        return { order: mapAdminOrderDetail(updated) };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

module.exports = {
    listOrders,
    getOrderDetail,
    updateOrderStatus,
    getAllowedNextStatuses,
    ADMIN_TRANSITIONS
};

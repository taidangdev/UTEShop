const { Op } = require('sequelize');
const sequelize = require('../config/db');
const {
    Order,
    OrderItem,
    Payment,
    Product,
    ProductVariant,
    User,
    Consignment
} = require('../models');
const { STATUS_LABELS, ORDER_STATUSES } = require('./adminDashboard.service');
const notificationService = require('./notification.service');
const loyaltyService = require('./loyalty.service');
const couponService = require('./coupon.service');
const promotionService = require('./promotion.service');

const MAX_DELIVERY_ATTEMPTS = 3;

const ADMIN_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled', 'refunded'],
    processing: ['shipping', 'cancelled'],
    shipping: ['delivered', 'delivery_failed'],
    delivery_failed: ['shipping', 'returned'],
    delivered: [],
    return_requested: ['return_approved', 'delivered'],
    return_approved: ['returned'],
    returned: ['refunded'],
    cancelled: [],
    refunded: [],
    cancel_requested: ['cancelled', 'processing']
};

/** Nhãn nút hành động admin (ưu tiên hơn STATUS_LABELS cho một số chuyển trạng thái) */
const ACTION_LABELS = {
    delivery_failed: 'Giao thất bại',
    shipping: 'Giao lại',
    returned: 'Nhận hàng hoàn',
    return_approved: 'Duyệt trả hàng',
    delivered: 'Từ chối trả hàng',
    refunded: 'Hoàn tiền'
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
    },
    delivery_failed: {
        title: '⚠️ Giao hàng không thành công',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} giao không thành công. Shop sẽ liên hệ và giao lại sớm nhất.`
    },
    returned: {
        title: '📦 Đơn hàng đã hoàn trả',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} đã được hoàn trả thành công.`
    },
    return_requested: {
        title: '🔄 Yêu cầu trả hàng đang chờ duyệt',
        content: (orderNumber) =>
            `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đang được shop xem xét.`
    },
    return_approved: {
        title: '📦 Yêu cầu trả hàng được phê duyệt',
        content: (orderNumber) =>
            `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đã được phê duyệt. Vui lòng chờ shipper thu hồi.`
    },
    cancel_requested: {
        title: '❓ Yêu cầu hủy đơn hàng',
        content: (orderNumber) =>
            `Đơn hàng ${orderNumber} của bạn có yêu cầu hủy đang chờ shop phê duyệt.`
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

function getAllowedNextStatuses(order) {
    const currentStatus = order.status;
    const failCount = order.deliveryFailCount || 0;
    const base = ADMIN_TRANSITIONS[currentStatus] || [];

    return base
        .filter((nextStatus) => {
            if (currentStatus === 'delivery_failed' && nextStatus === 'shipping') {
                return failCount < MAX_DELIVERY_ATTEMPTS;
            }
            return true;
        })
        .map((nextStatus) => {
            let label = ACTION_LABELS[nextStatus] || STATUS_LABELS[nextStatus] || nextStatus;

            // Custom labels based on transition context
            if (currentStatus === 'shipping' && nextStatus === 'delivered') {
                label = 'Giao thành công';
            } else if (currentStatus === 'return_requested' && nextStatus === 'delivered') {
                label = 'Từ chối trả hàng';
            } else if (currentStatus === 'delivery_failed' && nextStatus === 'shipping') {
                label = 'Giao lại';
            } else if (currentStatus === 'cancel_requested' && nextStatus === 'cancelled') {
                label = 'Duyệt hủy đơn';
            } else if (currentStatus === 'cancel_requested' && nextStatus === 'processing') {
                label = 'Từ chối hủy đơn';
            } else if (nextStatus === 'shipping') {
                label = 'Giao hàng';
            }

            return {
                status: nextStatus,
                label
            };
        });
}

function resolveStatusTransition(order, requestedStatus) {
    const currentStatus = order.status;

    if (currentStatus === 'shipping' && requestedStatus === 'delivery_failed') {
        const nextCount = (order.deliveryFailCount || 0) + 1;
        if (nextCount >= MAX_DELIVERY_ATTEMPTS) {
            return { resolvedStatus: 'returned', incrementFailCount: true };
        }
        return { resolvedStatus: 'delivery_failed', incrementFailCount: true };
    }

    return { resolvedStatus: requestedStatus, incrementFailCount: false };
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
        returnedAt: order.returnedAt,
        returnReason: order.returnReason || null,
        returnRequestedAt: order.returnRequestedAt || null,
        returnApprovedAt: order.returnApprovedAt || null,
        deliveryFailCount: order.deliveryFailCount || 0,
        maxDeliveryAttempts: MAX_DELIVERY_ATTEMPTS,
        deliveryType: snapshot.deliveryType || null,
        itemCount: order.getDataValue ? (order.getDataValue('itemCount') || 0) : (order.items?.length || 0),
        allowedNextStatuses: getAllowedNextStatuses(order)
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
        attributes: {
            include: [
                [
                    sequelize.literal(`(
                        SELECT COUNT(*)
                        FROM order_items AS items
                        WHERE items.orderId = Order.id
                    )`),
                    'itemCount'
                ]
            ]
        },
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
            }
        ],
        order: [['placedAt', 'DESC']],
        limit: safeLimit,
        offset,
        distinct: true,
        subQuery: false
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

async function applyStatusSideEffects(
    order,
    payment,
    newStatus,
    { previousStatus, incrementFailCount },
    transaction,
    notificationsArray = []
) {
    const now = new Date();
    const orderUpdates = { status: newStatus };

    if (incrementFailCount) {
        orderUpdates.deliveryFailCount = (order.deliveryFailCount || 0) + 1;
    }

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

        // Auto-update Consignment status if there are consignment items in the order
        const consignmentItems = await OrderItem.findAll({
            where: { orderId: order.id },
            include: [{ model: Product, as: 'product', where: { productType: 'consignment' } }],
            transaction
        });

        for (const item of consignmentItems) {
            const consignment = await Consignment.findOne({
                where: { productId: item.productId, status: 'ON_SALE' },
                include: [{ model: User, as: 'user' }],
                transaction
            });

            if (consignment) {
                await consignment.update({ status: 'SOLD' }, { transaction });

                // Construct email and system notification payload
                const content = `Sản phẩm ký gửi "${consignment.title}" của bạn đã bán thành công. Đang chờ đối soát thanh toán.`;
                const emailHtml = `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e9e9e9; border-radius: 10px;">
                        <h2 style="color: #6200ee; text-align: center;">Sản phẩm ký gửi đã được bán tại UTEShop</h2>
                        <p>Xin chào <strong>${consignment.user.fullName || consignment.user.username}</strong>,</p>
                        <p>Chúng tôi xin vui mừng thông báo sản phẩm ký gửi của bạn đã được bán thành công:</p>
                        <div style="background-color: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                            <p style="margin: 0 0 10px 0;"><strong>Sản phẩm:</strong> ${consignment.title}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Mã ký gửi:</strong> #${consignment.id}</p>
                            <p style="margin: 0 0 10px 0;"><strong>Trạng thái mới:</strong> <span style="background-color: #2e7d32; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">ĐÃ BÁN (SOLD)</span></p>
                            <p style="margin: 0;"><strong>Nội dung:</strong> ${content}</p>
                        </div>
                        <p>Vui lòng chờ Ban quản trị tiến hành đối soát thanh toán và tất toán số tiền thực nhận vào ví điểm thưởng của bạn.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
                            Đây là email tự động từ hệ thống UTEShop. Vui lòng không phản hồi lại email này.
                        </p>
                    </div>
                `;

                notificationsArray.push({
                    userId: consignment.userId,
                    title: `🎉 Sản phẩm ký gửi #${consignment.id} đã được bán!`,
                    content,
                    type: 'consignment_status_update',
                    relatedId: String(consignment.id),
                    emailOptions: {
                        email: consignment.user.email,
                        subject: `[UTEShop] Sản phẩm ký gửi #${consignment.id} đã bán thành công`,
                        message: content,
                        html: emailHtml
                    }
                });
            }
        }
    }

    if (newStatus === 'return_requested') {
        orderUpdates.returnRequestedAt = now;
    }

    if (newStatus === 'return_approved') {
        orderUpdates.returnApprovedAt = now;
    }

    if (newStatus === 'returned') {
        orderUpdates.returnedAt = now;
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

        const allowedNext = (ADMIN_TRANSITIONS[order.status] || []).filter((nextStatus) => {
            if (order.status === 'delivery_failed' && nextStatus === 'shipping') {
                return (order.deliveryFailCount || 0) < MAX_DELIVERY_ATTEMPTS;
            }
            return true;
        });

        if (!allowedNext.includes(newStatus)) {
            const err = new Error(
                `Cannot transition from "${order.status}" to "${newStatus}"`
            );
            err.statusCode = 400;
            throw err;
        }

        const { resolvedStatus, incrementFailCount } = resolveStatusTransition(
            order,
            newStatus
        );

        const stockRestoredStatuses = ['cancelled', 'refunded', 'returned'];
        const shouldRestoreStock = stockRestoredStatuses.includes(resolvedStatus) &&
                                   !stockRestoredStatuses.includes(order.status);
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

            // Refund loyalty points if user is logged in and points were redeemed
            const pointsToRefund = order.shippingSnapshot?.pointsRedeemed;
            if (order.userId && pointsToRefund > 0) {
                await loyaltyService.addPoints(
                    order.userId,
                    pointsToRefund,
                    {
                        type: 'cancel_refund_return',
                        referenceType: 'order',
                        referenceId: order.id,
                        note: `Hoàn điểm do thay đổi trạng thái đơn hàng ${order.orderNumber} sang ${resolvedStatus}`
                    },
                    transaction
                );
            }

            // Rollback personal coupon usage if applied
            await couponService.rollbackCouponUsage(order.id, transaction);

            // Rollback store promotion redemptions if applied
            await promotionService.rollbackPromotionRedemption(order.id, transaction);
        }

        if (adminNote !== undefined) {
            await order.update({ adminNote: adminNote || null }, { transaction });
        }

        const originalStatusBeforeEffects = order.status;

        const consignmentNotifications = [];
        await applyStatusSideEffects(order, order.payment, resolvedStatus, {
            previousStatus: order.status,
            incrementFailCount
        }, transaction, consignmentNotifications);

        await transaction.commit();

        // Dispatch consignment sold notifications asynchronously after successful commit
        if (consignmentNotifications.length > 0) {
            (async () => {
                for (const notif of consignmentNotifications) {
                    try {
                        await notificationService.createNotification(notif);
                    } catch (err) {
                        console.error('❌ Failed to trigger notification for auto consignment sold:', err);
                    }
                }
            })();
        }

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

        let notification = STATUS_NOTIFICATIONS[resolvedStatus];
        if (originalStatusBeforeEffects === 'return_requested' && resolvedStatus === 'delivered') {
            notification = {
                title: '❌ Yêu cầu trả hàng bị từ chối',
                content: (orderNumber) => `Yêu cầu trả hàng cho đơn hàng ${orderNumber} đã bị shop từ chối.`
            };
        } else if (originalStatusBeforeEffects === 'cancel_requested' && resolvedStatus === 'processing') {
            const reasonSuffix = adminNote ? ` Lý do: ${adminNote}` : '';
            notification = {
                title: '❌ Yêu cầu hủy đơn bị từ chối',
                content: (orderNumber) => `Yêu cầu hủy đơn hàng ${orderNumber} đã bị shop từ chối. Shop tiếp tục chuẩn bị hàng.${reasonSuffix}`
            };
        }
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

async function updateOrderNote(orderNumber, { adminNote }) {
    const order = await Order.findOne({
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

    if (!order) {
        const err = new Error('Order not found');
        err.statusCode = 404;
        throw err;
    }

    await order.update({ adminNote: adminNote || null });

    return { order: mapAdminOrderDetail(order) };
}

module.exports = {
    listOrders,
    getOrderDetail,
    updateOrderStatus,
    updateOrderNote,
    getAllowedNextStatuses,
    ADMIN_TRANSITIONS,
    MAX_DELIVERY_ATTEMPTS
};

const {
    Order,
    OrderItem,
    Payment,
    Product,
    ProductImage,
    ProductReview
} = require('../models');

const STATUS_UI = {
    pending: {
        label: 'Đơn mới',
        statusClass: 'bg-surface-container-highest text-on-surface-variant',
        progress: 1
    },
    confirmed: {
        label: 'Đã xác nhận',
        statusClass: 'bg-primary/10 text-primary',
        progress: 1
    },
    processing: {
        label: 'Chuẩn bị hàng',
        statusClass: 'bg-primary/10 text-primary',
        progress: 2
    },
    shipping: {
        label: 'Đang giao hàng',
        statusClass: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
        progress: 3
    },
    delivered: {
        label: 'Đã giao thành công',
        statusClass: 'bg-surface-container-highest text-on-surface-variant',
        progress: 0
    },
    cancelled: {
        label: 'Đã hủy đơn',
        statusClass: 'bg-error-container text-on-error-container',
        progress: 0
    },
    refunded: {
        label: 'Đã hoàn tiền',
        statusClass: 'bg-error-container text-on-error-container',
        progress: 0
    }
};

function serializeUser(user) {
    if (!user) return null;
    return user.get ? user.get({ plain: true }) : user;
}

function formatMoney(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

function orderDetailText(order) {
    const placed = order.placedAt ? formatDate(order.placedAt) : '';
    const snapshot = order.shippingSnapshot || {};

    if (order.status === 'delivered' && order.deliveredAt) {
        return `Delivered on ${formatDate(order.deliveredAt)}`;
    }
    if (order.status === 'shipping') {
        return placed ? `Shipped — placed ${placed}` : 'On the way to you';
    }
    if (order.status === 'cancelled') {
        return order.cancelledAt
            ? `Cancelled on ${formatDate(order.cancelledAt)}`
            : 'Order was cancelled';
    }
    if (snapshot.deliveryType === 'campus') {
        return 'Campus delivery';
    }
    if (placed) {
        return `Placed on ${placed}`;
    }
    return 'Order received';
}

function primaryProductImage(product) {
    if (!product?.images?.length) return null;
    const primary = product.images.find((img) => img.isPrimary) || product.images[0];
    return primary?.url || null;
}

function mapOrderRow(order) {
    const items = order.items || [];
    const first = items[0];
    const ui = STATUS_UI[order.status] || STATUS_UI.pending;
    const extraCount = items.length > 1 ? items.length - 1 : 0;
    const title = first
        ? extraCount > 0
            ? `${first.productName} + ${extraCount} more`
            : first.productName
        : 'Order items';

    const isActive = ['pending', 'confirmed', 'processing', 'shipping'].includes(order.status);

    return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        statusLabel: ui.label,
        statusClass: ui.statusClass,
        title,
        detail: orderDetailText(order),
        price: formatMoney(order.total),
        priceClass: order.status === 'cancelled' ? 'text-on-surface-variant' : 'text-primary',
        image: primaryProductImage(first?.product) || '/PremiumLaptop.png',
        action: isActive ? 'Track Order' : 'View Details',
        actionClass: isActive
            ? 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-high',
        progress: ui.progress,
        placedAt: order.placedAt,
        itemCount: items.length,
        total: Number(order.total),
        payment: order.payment
            ? {
                  method: order.payment.method,
                  status: order.payment.status
              }
            : null
    };
}

function mapReviewRow(review) {
    const product = review.product;
    const primaryImage = primaryProductImage(product);

    return {
        id: review.id,
        productId: review.productId,
        productName: product?.name || 'Product',
        productSlug: product?.slug || null,
        productImageUrl: primaryImage || '/PremiumLaptop.png',
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt
    };
}

async function getUserStats(userId) {
    const [orderCount, reviewCount] = await Promise.all([
        Order.count({ where: { userId } }),
        ProductReview.count({ where: { userId } })
    ]);

    return { orderCount, reviewCount };
}

async function listUserOrders(userId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await Order.findAndCountAll({
        where: { userId },
        include: [
            {
                model: OrderItem,
                as: 'items',
                include: [
                    {
                        model: Product,
                        as: 'product',
                        attributes: ['id', 'slug', 'name'],
                        include: [
                            {
                                model: ProductImage,
                                as: 'images',
                                attributes: ['url', 'isPrimary', 'sortOrder']
                            }
                        ]
                    }
                ]
            },
            {
                model: Payment,
                as: 'payment',
                required: false
            }
        ],
        order: [
            ['placedAt', 'DESC'],
            ['createdAt', 'DESC']
        ],
        limit: limitNum,
        offset,
        distinct: true
    });

    return {
        orders: rows.map(mapOrderRow),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages: Math.ceil(count / limitNum) || 0
        }
    };
}

async function listUserReviews(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await ProductReview.findAndCountAll({
        where: { userId },
        include: [
            {
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'slug'],
                include: [
                    {
                        model: ProductImage,
                        as: 'images',
                        attributes: ['url', 'isPrimary', 'sortOrder']
                    }
                ]
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset
    });

    return {
        reviews: rows.map(mapReviewRow),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages: Math.ceil(count / limitNum) || 0
        }
    };
}

module.exports = {
    serializeUser,
    getUserStats,
    listUserOrders,
    listUserReviews
};

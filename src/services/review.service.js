const { Op } = require('sequelize');
const sequelize = require('../config/db');
const {
    Order,
    OrderItem,
    Product,
    ProductImage,
    ProductReview,
    User
} = require('../models');
const rewardConfig = require('../config/reviewRewards');
const rewardService = require('./reward.service');
const loyaltyService = require('./loyalty.service');
const notificationService = require('./notification.service');


const ELIGIBLE_STATUSES = rewardConfig.eligibleOrderStatuses;

function mapReviewRow(review, product) {
    const json = review.toJSON ? review.toJSON() : review;
    const primaryImage =
        product?.images?.find((img) => img.isPrimary) || product?.images?.[0] || null;

    return {
        id: json.id,
        productId: json.productId,
        orderId: json.orderId,
        orderItemId: json.orderItemId,
        rating: json.rating,
        title: json.title,
        comment: json.comment,
        status: json.status,
        rewardType: json.rewardType,
        rewardGrantedAt: json.rewardGrantedAt,
        rewardPayload: json.rewardPayload,
        createdAt: json.createdAt,
        product: product
            ? {
                  id: product.id,
                  name: product.name,
                  slug: product.slug,
                  imageUrl: primaryImage?.url || null
              }
            : null
    };
}

async function listEligibleItems(userId) {
    const reviewedItemIds = await ProductReview.findAll({
        where: { userId },
        attributes: ['orderItemId']
    });
    const reviewedSet = new Set(reviewedItemIds.map((r) => r.orderItemId));

    const orders = await Order.findAll({
        where: {
            userId,
            status: { [Op.in]: ELIGIBLE_STATUSES }
        },
        include: [
            {
                model: OrderItem,
                as: 'items',
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
                ]
            }
        ],
        order: [['placedAt', 'DESC']]
    });

    const eligible = [];

    for (const order of orders) {
        for (const item of order.items || []) {
            if (reviewedSet.has(item.id)) continue;

            const product = item.product;
            const primaryImage =
                product?.images?.find((img) => img.isPrimary) || product?.images?.[0];

            eligible.push({
                orderId: order.id,
                orderNumber: order.orderNumber,
                orderStatus: order.status,
                orderItemId: item.id,
                productId: item.productId,
                productName: item.productName,
                productSlug: product?.slug || null,
                productImageUrl: primaryImage?.url || null,
                quantity: item.quantity,
                unitPrice: Number(item.unitPrice),
                placedAt: order.placedAt
            });
        }
    }

    return { items: eligible };
}

async function createReview(userId, payload) {
    const { orderItemId, rating, title, comment, rewardType } = payload;
    const orderItem = await OrderItem.findByPk(orderItemId, {
        include: [
            { model: Order, as: 'order' },
            { model: Product, as: 'product' }
        ]
    });

    if (!orderItem || !orderItem.order || orderItem.order.userId !== userId) {
        const err = new Error('Order item not found');
        err.statusCode = 404;
        throw err;
    }

    const order = orderItem.order;

    if (!ELIGIBLE_STATUSES.includes(order.status)) {
        const err = new Error('Only delivered orders can be reviewed');
        err.statusCode = 400;
        err.code = 'ORDER_NOT_ELIGIBLE';
        throw err;
    }

    const existing = await ProductReview.findOne({ where: { orderItemId } });
    if (existing) {
        const err = new Error('You have already reviewed this item');
        err.statusCode = 409;
        err.code = 'ALREADY_REVIEWED';
        throw err;
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        const err = new Error('Rating must be between 1 and 5');
        err.statusCode = 400;
        throw err;
    }

    const chosenReward = rewardType === 'coupon' ? 'coupon' : 'points';
    const initialStatus = rewardConfig.autoApproveReviews ? 'approved' : 'pending';

    const transaction = await sequelize.transaction();

    try {
        const review = await ProductReview.create(
            {
                productId: orderItem.productId,
                userId,
                orderId: order.id,
                orderItemId: orderItem.id,
                rating: ratingNum,
                title: title ? String(title).trim().slice(0, 200) : null,
                comment: comment ? String(comment).trim() : null,
                status: initialStatus,
                rewardType: null,
                rewardGrantedAt: null,
                rewardPayload: null
            },
            { transaction }
        );

        const reward = await rewardService.grantReviewReward(
            userId,
            review,
            chosenReward,
            transaction
        );

        await transaction.commit();

        // Gửi thông báo realtime và email cho Admin (chạy ngầm)
        (async () => {
            try {
                const reviewer = await User.findByPk(userId);
                const reviewerName = reviewer?.fullName || reviewer?.username || 'Khách hàng';
                
                await notificationService.createNotification({
                    userId: null, // Gửi cho Admin
                    title: `⭐ Đánh giá mới từ ${reviewerName}`,
                    content: `Sản phẩm "${orderItem.product?.name || 'Sản phẩm'}" được đánh giá ${ratingNum} sao.`,
                    type: 'review_new',
                    relatedId: review.id,
                    emailOptions: {
                        targetRole: 'admin',
                        subject: `[UTEShop] Đánh giá mới từ ${reviewerName}`,
                        message: `Khách hàng ${reviewerName} đã đánh giá sản phẩm "${orderItem.product?.name || 'Sản phẩm'}".\n\nĐiểm đánh giá: ${ratingNum}/5 sao\nTiêu đề: ${title || '(Trống)'}\nNội dung: ${comment || '(Trống)'}\n\nVui lòng truy cập trang quản trị để xem chi tiết.`,
                        html: `<h3>Có đánh giá sản phẩm mới!</h3>
                               <p><strong>Khách hàng:</strong> ${reviewerName}</p>
                               <p><strong>Sản phẩm:</strong> ${orderItem.product?.name || 'Sản phẩm'}</p>
                               <p><strong>Điểm đánh giá:</strong> ${ratingNum}/5 sao</p>
                               <p><strong>Tiêu đề:</strong> ${title || '(Trống)'}</p>
                               <p><strong>Nội dung:</strong> ${comment || '(Trống)'}</p>
                               <p>Vui lòng truy cập hệ thống để duyệt hoặc phản hồi.</p>`
                    }
                });
            } catch (err) {
                console.error('❌ Error sending review notification:', err);
            }
        })();

        await review.reload();
        const balance = await loyaltyService.getBalance(userId);

        return {
            review: mapReviewRow(review, orderItem.product),
            reward,
            loyaltyPoints: balance
        };
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
}

async function listProductReviews(productId, { page = 1, limit = 10 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await ProductReview.findAndCountAll({
        where: { productId, status: 'approved' },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'fullName', 'username', 'avatarUrl']
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset
    });

    return {
        reviews: rows.map((r) => ({
            id: r.id,
            rating: r.rating,
            title: r.title,
            comment: r.comment,
            createdAt: r.createdAt,
            user: r.user
                ? {
                      id: r.user.id,
                      fullName: r.user.fullName,
                      username: r.user.username,
                      avatarUrl: r.user.avatarUrl
                  }
                : null
        })),
        pagination: {
            page: pageNum,
            limit: limitNum,
            total: count,
            totalPages: Math.ceil(count / limitNum) || 0
        }
    };
}

module.exports = {
    listEligibleItems,
    createReview,
    listProductReviews,
    mapReviewRow
};

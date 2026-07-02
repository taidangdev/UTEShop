const crypto = require('crypto');
const { Op } = require('sequelize');
const { UserCoupon } = require('../models');
const rewardConfig = require('../config/reviewRewards');

function generateCouponCode() {
    const part = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `UTE-REV-${part}`;
}

function couponExpiresAt() {
    const d = new Date();
    d.setDate(d.getDate() + rewardConfig.reviewCouponValidDays);
    return d;
}

async function createReviewRewardCoupon(userId, reviewId, transaction) {
    let code = generateCouponCode();
    let attempts = 0;

    while (attempts < 5) {
        const exists = await UserCoupon.findOne({ where: { code }, transaction });
        if (!exists) break;
        code = generateCouponCode();
        attempts += 1;
    }

    const coupon = await UserCoupon.create(
        {
            userId,
            code,
            source: 'review_reward',
            reviewId,
            discountType: rewardConfig.reviewCouponType,
            discountValue: rewardConfig.reviewCouponValue,
            minOrderAmount: rewardConfig.reviewCouponMinOrder,
            expiresAt: couponExpiresAt(),
            isUsed: false
        },
        { transaction }
    );

    return coupon;
}

function mapCouponRow(coupon) {
    return {
        id: coupon.id,
        code: coupon.code,
        source: coupon.source,
        discountType: coupon.discountType,
        discountValue: Number(coupon.discountValue),
        minOrderAmount: coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : 0,
        expiresAt: coupon.expiresAt,
        isUsed: coupon.isUsed,
        usedAt: coupon.usedAt,
        reviewId: coupon.reviewId
    };
}

async function listActiveCoupons(userId) {
    const now = new Date();
    const rows = await UserCoupon.findAll({
        where: {
            userId,
            isUsed: false,
            expiresAt: { [Op.gt]: now }
        },
        order: [['createdAt', 'DESC']]
    });

    return rows.map(mapCouponRow);
}

async function findValidUserCoupon(userId, code) {
    const normalized = String(code || '')
        .trim()
        .toUpperCase();
    if (!normalized) return null;

    const now = new Date();
    const coupon = await UserCoupon.findOne({
        where: {
            userId,
            code: normalized,
            isUsed: false,
            expiresAt: { [Op.gt]: now }
        }
    });

    return coupon;
}

function calculateCouponDiscount(coupon, subtotal) {
    const min = coupon.minOrderAmount != null ? Number(coupon.minOrderAmount) : 0;
    if (subtotal < min) {
        const err = new Error(`Đơn hàng tối thiểu để sử dụng phiếu này là ${new Intl.NumberFormat('vi-VN').format(min)} VNĐ`);
        err.statusCode = 400;
        err.code = 'COUPON_MIN_ORDER';
        throw err;
    }

    const value = Number(coupon.discountValue);
    if (coupon.discountType === 'percentage') {
        return Math.round(subtotal * (value / 100) * 100) / 100;
    }
    if (coupon.discountType === 'fixed_amount') {
        return Math.min(subtotal, value);
    }
    if (coupon.discountType === 'free_shipping') {
        return 0;
    }
    return 0;
}

async function markCouponUsed(couponId, orderId, transaction) {
    const coupon = await UserCoupon.findByPk(couponId, { transaction });
    if (!coupon || coupon.isUsed) return;
    await coupon.update(
        {
            isUsed: true,
            usedAt: new Date(),
            usedOnOrderId: orderId
        },
        { transaction }
    );
}

async function rollbackCouponUsage(orderId, transaction) {
    await UserCoupon.update(
        {
            isUsed: false,
            usedAt: null,
            usedOnOrderId: null
        },
        {
            where: { usedOnOrderId: orderId },
            transaction
        }
    );
}

module.exports = {
    createReviewRewardCoupon,
    listActiveCoupons,
    findValidUserCoupon,
    calculateCouponDiscount,
    markCouponUsed,
    rollbackCouponUsage,
    mapCouponRow
};

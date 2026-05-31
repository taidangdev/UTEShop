/**
 * Review reward configuration (override via .env)
 */
module.exports = {
    /** Order statuses that allow product review (delivered only) */
    eligibleOrderStatuses: ['delivered'],

    /** Points granted per review when rewardType = points */
    reviewPointsAmount: Number(process.env.REVIEW_REWARD_POINTS) || 50,

    /** Coupon: percentage off order subtotal */
    reviewCouponType: 'percentage',
    reviewCouponValue: Number(process.env.REVIEW_COUPON_PERCENT) || 10,
    reviewCouponMinOrder: Number(process.env.REVIEW_COUPON_MIN_ORDER) || 0,
    reviewCouponValidDays: Number(process.env.REVIEW_COUPON_VALID_DAYS) || 30,

    /** Points redemption at checkout: points per $1 discount */
    pointsPerDollar: Number(process.env.POINTS_PER_DOLLAR) || 100,
    maxPointsDiscountPercent: Number(process.env.MAX_POINTS_DISCOUNT_PERCENT) || 20,

    /** Auto-approve reviews on submit (visible on product page immediately) */
    autoApproveReviews: process.env.REVIEW_AUTO_APPROVE !== 'false'
};

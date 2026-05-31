const rewardConfig = require('../config/reviewRewards');
const loyaltyService = require('./loyalty.service');
const couponService = require('./coupon.service');

async function grantReviewReward(userId, review, rewardType, transaction) {
    const type = rewardType === 'coupon' ? 'coupon' : 'points';
    let payload;

    if (type === 'coupon') {
        const coupon = await couponService.createReviewRewardCoupon(
            userId,
            review.id,
            transaction
        );
        payload = {
            type: 'coupon',
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue),
            expiresAt: coupon.expiresAt
        };
    } else {
        const points = rewardConfig.reviewPointsAmount;
        const result = await loyaltyService.addPoints(
            userId,
            points,
            {
                type: 'review_reward',
                referenceType: 'review',
                referenceId: review.id,
                note: `Review reward for order item #${review.orderItemId}`
            },
            transaction
        );
        payload = {
            type: 'points',
            points: result.earned,
            balance: result.balance
        };
    }

    await review.update(
        {
            rewardType: type,
            rewardGrantedAt: new Date(),
            rewardPayload: payload
        },
        { transaction }
    );

    return payload;
}

module.exports = { grantReviewReward };

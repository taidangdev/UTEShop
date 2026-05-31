const sequelize = require('../config/db');
const { User, PointTransaction } = require('../models');
const rewardConfig = require('../config/reviewRewards');

async function getBalance(userId) {
    const user = await User.findByPk(userId, { attributes: ['id', 'loyaltyPoints'] });
    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
    return user.loyaltyPoints ?? 0;
}

async function addPoints(userId, amount, { type, referenceType, referenceId, note }, transaction) {
    if (amount <= 0) {
        const err = new Error('Points amount must be positive');
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findByPk(userId, {
        attributes: ['id', 'loyaltyPoints'],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }

    const balanceAfter = (user.loyaltyPoints ?? 0) + amount;
    await user.update({ loyaltyPoints: balanceAfter }, { transaction });

    await PointTransaction.create(
        {
            userId,
            amount,
            balanceAfter,
            type,
            referenceType: referenceType || null,
            referenceId: referenceId || null,
            note: note || null
        },
        { transaction }
    );

    return { balance: balanceAfter, earned: amount };
}

async function redeemPoints(userId, pointsToRedeem, { referenceType, referenceId, note }, transaction) {
    if (pointsToRedeem <= 0) {
        const err = new Error('Points to redeem must be positive');
        err.statusCode = 400;
        throw err;
    }

    const user = await User.findByPk(userId, {
        attributes: ['id', 'loyaltyPoints'],
        transaction,
        lock: transaction ? transaction.LOCK.UPDATE : undefined
    });

    if (!user) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }

    const current = user.loyaltyPoints ?? 0;
    if (current < pointsToRedeem) {
        const err = new Error('Insufficient loyalty points');
        err.statusCode = 400;
        err.code = 'INSUFFICIENT_POINTS';
        throw err;
    }

    const balanceAfter = current - pointsToRedeem;
    await user.update({ loyaltyPoints: balanceAfter }, { transaction });

    await PointTransaction.create(
        {
            userId,
            amount: -pointsToRedeem,
            balanceAfter,
            type: 'checkout_redeem',
            referenceType: referenceType || null,
            referenceId: referenceId || null,
            note: note || null
        },
        { transaction }
    );

    return { balance: balanceAfter, redeemed: pointsToRedeem };
}

function pointsToDiscountAmount(points) {
    const dollars = points / rewardConfig.pointsPerDollar;
    return Math.round(dollars * 100) / 100;
}

function maxRedeemablePoints(subtotal, userBalance) {
    const maxByPercent =
        (subtotal * rewardConfig.maxPointsDiscountPercent) / 100 * rewardConfig.pointsPerDollar;
    const maxPoints = Math.floor(maxByPercent);
    return Math.min(userBalance, maxPoints);
}

async function listTransactions(userId, { page = 1, limit = 20 } = {}) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { rows, count } = await PointTransaction.findAndCountAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
        limit: limitNum,
        offset
    });

    return {
        balance: await getBalance(userId),
        transactions: rows.map((t) => ({
            id: t.id,
            amount: t.amount,
            balanceAfter: t.balanceAfter,
            type: t.type,
            note: t.note,
            referenceType: t.referenceType,
            referenceId: t.referenceId,
            createdAt: t.createdAt
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
    getBalance,
    addPoints,
    redeemPoints,
    pointsToDiscountAmount,
    maxRedeemablePoints,
    listTransactions
};

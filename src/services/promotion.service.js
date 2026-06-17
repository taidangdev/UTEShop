const { Op } = require('sequelize');
const {
    Promotion,
    PromotionRedemption,
    Category,
    Product
} = require('../models');

function normalizeCode(code) {
    return String(code || '')
        .trim()
        .toUpperCase();
}

function roundMoney(value) {
    return Math.round(Number(value) * 100) / 100;
}

function mapPromotionPublic(promotion) {
    return {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        scope: promotion.scope,
        type: promotion.type,
        value: Number(promotion.value),
        minOrderAmount: promotion.minOrderAmount != null ? Number(promotion.minOrderAmount) : 0,
        maxDiscountAmount: promotion.maxDiscountAmount != null ? Number(promotion.maxDiscountAmount) : null
    };
}

function assertPromotionWindow(promotion) {
    const now = new Date();
    if (promotion.startsAt && now < new Date(promotion.startsAt)) {
        const err = new Error('This promotion is not active yet');
        err.statusCode = 400;
        err.code = 'PROMOTION_NOT_STARTED';
        throw err;
    }
    if (promotion.endsAt && now > new Date(promotion.endsAt)) {
        const err = new Error('This promotion has expired');
        err.statusCode = 400;
        err.code = 'PROMOTION_EXPIRED';
        throw err;
    }
}

function assertUsageLimits(promotion, userId) {
    if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) {
        const err = new Error('This promotion has reached its usage limit');
        err.statusCode = 400;
        err.code = 'PROMOTION_USAGE_LIMIT';
        throw err;
    }
}

async function assertPerUserLimit(promotion, userId) {
    if (!userId || promotion.maxUsesPerUser == null) return;
    const count = await PromotionRedemption.count({
        where: { promotionId: promotion.id, userId }
    });
    if (count >= promotion.maxUsesPerUser) {
        const err = new Error('You have already used this promotion the maximum number of times');
        err.statusCode = 400;
        err.code = 'PROMOTION_USER_LIMIT';
        throw err;
    }
}

async function loadPromotionByCode(code, { transaction } = {}) {
    const normalized = normalizeCode(code);
    if (!normalized) return null;

    return Promotion.findOne({
        where: { code: normalized, isActive: true },
        include: [
            {
                model: Category,
                as: 'categories',
                attributes: ['id'],
                through: { attributes: [] }
            },
            {
                model: Product,
                as: 'products',
                attributes: ['id'],
                through: { attributes: [] }
            }
        ],
        transaction
    });
}

function getScopeSets(promotion) {
    const categoryIds = new Set();
    const productIds = new Set();

    if (promotion.scope === 'category') {
        (promotion.categories || []).forEach((c) => categoryIds.add(c.id));
        if (promotion.categoryId) categoryIds.add(promotion.categoryId);
    }
    if (promotion.scope === 'product') {
        (promotion.products || []).forEach((p) => productIds.add(p.id));
    }

    return { categoryIds, productIds };
}

function isLineEligible(line, promotion, scopeSets) {
    if (promotion.scope === 'shop') return true;
    if (promotion.scope === 'category') {
        return scopeSets.categoryIds.has(line.categoryId);
    }
    if (promotion.scope === 'product') {
        return scopeSets.productIds.has(line.productId);
    }
    return false;
}

function discountFromPromotionType(promotion, amount) {
    const base = Number(amount);
    if (base <= 0) return 0;

    const value = Number(promotion.value);
    if (promotion.type === 'percentage') {
        let discount = roundMoney(base * (value / 100));
        if (promotion.maxDiscountAmount != null) {
            const maxD = Number(promotion.maxDiscountAmount);
            if (maxD > 0) {
                discount = Math.min(discount, maxD);
            }
        }
        return discount;
    }
    if (promotion.type === 'fixed_amount') {
        return roundMoney(Math.min(base, value));
    }
    return 0;
}

/**
 * Apply shop promotion to cart lines. Returns adjusted lines + summary.
 */
function applyPromotionToLines(promotion, lineItems) {
    const scopeSets = getScopeSets(promotion);
    const eligibleLines = lineItems.filter((line) => isLineEligible(line, promotion, scopeSets));
    const eligibleSubtotal = eligibleLines.reduce((sum, line) => sum + line.lineTotal, 0);

    const minOrder = promotion.minOrderAmount != null ? Number(promotion.minOrderAmount) : 0;
    if (eligibleSubtotal < minOrder) {
        const err = new Error(
            `Minimum order amount for this code is $${minOrder.toFixed(2)} (eligible items: $${eligibleSubtotal.toFixed(2)})`
        );
        err.statusCode = 400;
        err.code = 'PROMOTION_MIN_ORDER';
        throw err;
    }

    if (eligibleLines.length === 0) {
        const err = new Error('No items in your cart are eligible for this promotion');
        err.statusCode = 400;
        err.code = 'PROMOTION_NO_ELIGIBLE_ITEMS';
        throw err;
    }

    let promotionDiscount = 0;
    let freeShipping = promotion.type === 'free_shipping';

    const lineAdjustments = lineItems.map((line) => ({
        cartItemId: line.cartItemId,
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        productName: line.productName,
        sku: line.sku,
        categoryId: line.categoryId,
        mapped: line.mapped,
        lineDiscount: 0,
        promotionId: null
    }));

    if (promotion.type === 'free_shipping') {
        return {
            promotion,
            promotionDiscount: 0,
            freeShipping: true,
            eligibleSubtotal,
            lineAdjustments
        };
    }

    if (promotion.scope === 'shop') {
        const cartSubtotal = lineItems.reduce((sum, line) => sum + line.lineTotal, 0);
        promotionDiscount = discountFromPromotionType(promotion, cartSubtotal);
    } else {
        for (const line of lineAdjustments) {
            if (!isLineEligible(line, promotion, scopeSets)) continue;
            const lineDiscount = discountFromPromotionType(promotion, line.lineTotal);
            line.lineDiscount = lineDiscount;
            line.promotionId = promotion.id;
            promotionDiscount += lineDiscount;
        }
        promotionDiscount = roundMoney(promotionDiscount);
    }

    return {
        promotion,
        promotionDiscount,
        freeShipping,
        eligibleSubtotal,
        lineAdjustments
    };
}

async function resolvePromotionForCheckout(code, lineItems, userId) {
    const normalized = normalizeCode(code);
    if (!normalized) return null;

    const promotion = await loadPromotionByCode(normalized);
    if (!promotion) {
        const err = new Error('Invalid or expired promotion code');
        err.statusCode = 400;
        err.code = 'INVALID_PROMOTION';
        throw err;
    }

    assertPromotionWindow(promotion);
    assertUsageLimits(promotion);
    await assertPerUserLimit(promotion, userId);

    return applyPromotionToLines(promotion, lineItems);
}

async function previewPromotion(code, lineItems, userId) {
    try {
        const result = await resolvePromotionForCheckout(code, lineItems, userId);
        if (!result) {
            return { valid: false, message: 'Enter a promotion code' };
        }
        return {
            valid: true,
            promotion: mapPromotionPublic(result.promotion),
            promotionDiscount: result.promotionDiscount,
            freeShipping: result.freeShipping,
            eligibleSubtotal: result.eligibleSubtotal
        };
    } catch (error) {
        return {
            valid: false,
            message: error.message,
            code: error.code
        };
    }
}

async function recordRedemption(promotionId, userId, orderId, discountAmount, transaction) {
    const promotion = await Promotion.findByPk(promotionId, {
        lock: transaction.LOCK.UPDATE,
        transaction
    });

    if (!promotion) {
        const err = new Error('Không tìm thấy chương trình khuyến mãi');
        err.statusCode = 400;
        throw err;
    }

    // Re-verify startsAt, endsAt, usageLimit, maxUsesPerUser within locking transaction
    const now = new Date();
    if (promotion.startsAt && now < new Date(promotion.startsAt)) {
        const err = new Error('Chương trình khuyến mãi chưa bắt đầu');
        err.statusCode = 400;
        throw err;
    }
    if (promotion.endsAt && now > new Date(promotion.endsAt)) {
        const err = new Error('Chương trình khuyến mãi đã hết hạn');
        err.statusCode = 400;
        throw err;
    }
    if (promotion.usageLimit != null && promotion.usedCount >= promotion.usageLimit) {
        const err = new Error('Chương trình khuyến mãi đã hết lượt sử dụng');
        err.statusCode = 400;
        throw err;
    }
    if (promotion.maxUsesPerUser != null && userId) {
        const count = await PromotionRedemption.count({
            where: { promotionId: promotion.id, userId },
            transaction
        });
        if (count >= promotion.maxUsesPerUser) {
            const err = new Error('Bạn đã sử dụng mã khuyến mãi này tối đa số lần cho phép');
            err.statusCode = 400;
            throw err;
        }
    }

    await PromotionRedemption.create(
        {
            promotionId,
            userId: userId || null,
            orderId,
            discountAmount: roundMoney(discountAmount)
        },
        { transaction }
    );

    await promotion.increment('usedCount', {
        by: 1,
        transaction
    });
}

async function listActivePromotions() {
    const now = new Date();
    const rows = await Promotion.findAll({
        where: {
            isActive: true,
            [Op.and]: [
                { [Op.or]: [{ startsAt: null }, { startsAt: { [Op.lte]: now } }] },
                { [Op.or]: [{ endsAt: null }, { endsAt: { [Op.gte]: now } }] }
            ]
        },
        include: [
            {
                model: Category,
                as: 'categories',
                attributes: ['id'],
                through: { attributes: [] }
            },
            {
                model: Product,
                as: 'products',
                attributes: ['id'],
                through: { attributes: [] }
            }
        ],
        order: [['createdAt', 'DESC']],
        limit: 20
    });

    return rows
        .filter((p) => p.usageLimit == null || p.usedCount < p.usageLimit)
        .map((p) => {
            const mapped = mapPromotionPublic(p);
            return {
                ...mapped,
                categoryIds: (p.categories || []).map((c) => c.id),
                productIds: (p.products || []).map((prod) => prod.id)
            };
        });
}

module.exports = {
    normalizeCode,
    loadPromotionByCode,
    resolvePromotionForCheckout,
    previewPromotion,
    applyPromotionToLines,
    recordRedemption,
    listActivePromotions,
    mapPromotionPublic,
    discountFromPromotionType
};

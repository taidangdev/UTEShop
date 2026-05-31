const promotionService = require('../services/promotion.service');
const checkoutService = require('../services/checkout.service');
const { successResponse } = require('../utils/responseHandler');

const listActive = async (req, res, next) => {
    try {
        const promotions = await promotionService.listActivePromotions();
        return successResponse(res, 200, 'OK', { promotions });
    } catch (error) {
        next(error);
    }
};

const validate = async (req, res, next) => {
    try {
        const { code, productIds } = req.body;
        const result = await checkoutService.validatePromotionForCart(req.cartContext, {
            code,
            productIds
        });
        return successResponse(res, 200, 'OK', result);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listActive,
    validate
};

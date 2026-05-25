const checkoutService = require('../services/checkout.service');
const { successResponse } = require('../utils/responseHandler');
const { CART_SESSION_COOKIE } = require('../middlewares/cart.middleware');

const preview = async (req, res, next) => {
    try {
        const { productIds, information } = req.body;
        const data = await checkoutService.previewCheckout(req.cartContext, {
            productIds,
            information
        });
        if (req.user?.id) {
            res.clearCookie(CART_SESSION_COOKIE);
        }
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const placeOrder = async (req, res, next) => {
    try {
        const { productIds, information, paymentMethod, guestEmail } = req.body;
        const data = await checkoutService.placeOrder(
            req.cartContext,
            {
                userId: req.user?.id || null,
                guestEmail: guestEmail || req.user?.email || null
            },
            { productIds, information, paymentMethod }
        );
        if (req.user?.id) {
            res.clearCookie(CART_SESSION_COOKIE);
        }
        return successResponse(res, 201, 'Order placed successfully', data);
    } catch (error) {
        next(error);
    }
};

const getOrder = async (req, res, next) => {
    try {
        const data = await checkoutService.getOrderForUser(req.params.orderNumber, req.user.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const cancelOrder = async (req, res, next) => {
    try {
        const { orderNumber } = req.params;
        const data = await checkoutService.cancelOrderForUser(orderNumber, req.user.id);
        return successResponse(res, 200, 'Order cancelled successfully', data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    preview,
    placeOrder,
    getOrder,
    cancelOrder
};

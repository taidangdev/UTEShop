const cartService = require('../services/cart.service');
const { successResponse } = require('../utils/responseHandler');
const { CART_SESSION_COOKIE } = require('../middlewares/cart.middleware');

const getCart = async (req, res, next) => {
    try {
        const cart = await cartService.getCart(req.cartContext);
        if (req.user?.id) {
            res.clearCookie(CART_SESSION_COOKIE);
        }
        return successResponse(res, 200, 'OK', { cart });
    } catch (error) {
        next(error);
    }
};

const addItem = async (req, res, next) => {
    try {
        const { productId, variantId, quantity } = req.body;
        const cart = await cartService.addItem(req.cartContext, {
            productId: Number(productId),
            variantId: variantId != null ? Number(variantId) : null,
            quantity: quantity != null ? Number(quantity) : 1
        });
        return successResponse(res, 200, 'Item added to cart', { cart });
    } catch (error) {
        next(error);
    }
};

const updateItem = async (req, res, next) => {
    try {
        const itemId = Number(req.params.itemId);
        const { quantity } = req.body;
        const cart = await cartService.updateItemQuantity(req.cartContext, itemId, Number(quantity));
        return successResponse(res, 200, 'Cart updated', { cart });
    } catch (error) {
        next(error);
    }
};

const removeItem = async (req, res, next) => {
    try {
        const itemId = Number(req.params.itemId);
        const cart = await cartService.removeItem(req.cartContext, itemId);
        return successResponse(res, 200, 'Item removed', { cart });
    } catch (error) {
        next(error);
    }
};

const clearCart = async (req, res, next) => {
    try {
        const cart = await cartService.clearCart(req.cartContext);
        return successResponse(res, 200, 'Cart cleared', { cart });
    } catch (error) {
        next(error);
    }
};

const mergeCart = async (req, res, next) => {
    try {
        const cart = await cartService.mergeGuestItems(req.user.id, req.body.items);
        res.clearCookie(CART_SESSION_COOKIE);
        return successResponse(res, 200, 'Cart merged', { cart });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    mergeCart
};

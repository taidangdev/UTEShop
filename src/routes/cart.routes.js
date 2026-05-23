const express = require('express');
const cartController = require('../controllers/cart.controller');
const { optionalVerifyToken, resolveCartContext } = require('../middlewares/cart.middleware');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const {
    addCartItemValidation,
    updateCartItemValidation,
    cartItemIdValidation,
    mergeCartValidation
} = require('../validators/cart.validator');

const router = express.Router();

router.use(optionalVerifyToken, resolveCartContext);

router.get('/', cartController.getCart);

router.post('/items', addCartItemValidation, validate, cartController.addItem);

router.put('/items/:itemId', updateCartItemValidation, validate, cartController.updateItem);

router.delete('/items/:itemId', cartItemIdValidation, validate, cartController.removeItem);

router.delete('/', cartController.clearCart);

router.post(
    '/merge',
    verifyToken,
    requirePermission('cart:manage'),
    mergeCartValidation,
    validate,
    cartController.mergeCart
);

module.exports = router;

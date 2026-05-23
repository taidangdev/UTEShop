const express = require('express');
const checkoutController = require('../controllers/checkout.controller');
const { optionalVerifyToken, resolveCartContext } = require('../middlewares/cart.middleware');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const {
    previewCheckoutValidation,
    placeOrderValidation,
    orderNumberValidation
} = require('../validators/checkout.validator');

const router = express.Router();

router.use(optionalVerifyToken, resolveCartContext);

router.post(
    '/preview',
    previewCheckoutValidation,
    validate,
    checkoutController.preview
);

router.post(
    '/place-order',
    placeOrderValidation,
    validate,
    checkoutController.placeOrder
);

router.get(
    '/orders/:orderNumber',
    verifyToken,
    requirePermission('orders:read'),
    orderNumberValidation,
    validate,
    checkoutController.getOrder
);

module.exports = router;

const express = require('express');
const promotionController = require('../controllers/promotion.controller');
const { optionalVerifyToken, resolveCartContext } = require('../middlewares/cart.middleware');
const { optionalVerifyToken: optionalAuth } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { body } = require('express-validator');

const router = express.Router();

router.get('/active', optionalAuth, promotionController.listActive);

router.post(
    '/validate',
    optionalVerifyToken,
    resolveCartContext,
    body('code').trim().notEmpty().withMessage('Promotion code is required'),
    body('productIds').isArray({ min: 1 }).withMessage('productIds is required'),
    validate,
    promotionController.validate
);

module.exports = router;

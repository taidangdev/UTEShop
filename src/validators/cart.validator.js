const { body, param } = require('express-validator');

const addCartItemValidation = [
    body('productId').isInt({ min: 1 }).withMessage('productId must be a positive integer'),
    body('variantId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('variantId must be a positive integer'),
    body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('quantity must be between 1 and 99')
];

const updateCartItemValidation = [
    param('itemId').isInt({ min: 1 }).withMessage('itemId must be a positive integer'),
    body('quantity').isInt({ min: 0, max: 99 }).withMessage('quantity must be between 0 and 99')
];

const cartItemIdValidation = [param('itemId').isInt({ min: 1 }).withMessage('itemId must be a positive integer')];

const mergeCartValidation = [
    body('items').isArray({ min: 0 }).withMessage('items must be an array'),
    body('items.*.productId').isInt({ min: 1 }).withMessage('Each item needs a valid productId'),
    body('items.*.quantity').optional().isInt({ min: 1, max: 99 }),
    body('items.*.variantId').optional({ nullable: true }).isInt({ min: 1 })
];

module.exports = {
    addCartItemValidation,
    updateCartItemValidation,
    cartItemIdValidation,
    mergeCartValidation
};

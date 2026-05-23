const { body, param } = require('express-validator');

const checkoutInformationValidation = [
    body('information.fullName').trim().notEmpty().withMessage('Full name is required'),
    body('information.phone').trim().notEmpty().withMessage('Phone is required'),
    body('information.deliveryType')
        .optional()
        .isIn(['campus', 'home'])
        .withMessage('deliveryType must be campus or home'),
    body('information.street').trim().notEmpty().withMessage('Street address is required'),
    body('information.city').trim().notEmpty().withMessage('City is required'),
    body('information.state').trim().notEmpty().withMessage('State is required'),
    body('information.postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('information.studentId').optional().isString(),
    body('information.coupon')
        .optional()
        .isIn(['', 'NEW2024', 'FREESHIP', 'LABKIT'])
        .withMessage('Invalid coupon'),
    body('information.discountCode').optional().isString(),
    body('information.appliedDiscountCode').optional().isString()
];

const checkoutProductIdsValidation = [
    body('productIds')
        .optional()
        .isArray({ min: 1 })
        .withMessage('productIds must be a non-empty array when provided'),
    body('productIds.*').isInt({ min: 1 }).withMessage('Each productId must be a positive integer')
];

const previewCheckoutValidation = [...checkoutProductIdsValidation, ...checkoutInformationValidation];

const placeOrderValidation = [
    ...checkoutProductIdsValidation,
    ...checkoutInformationValidation,
    body('paymentMethod')
        .notEmpty()
        .withMessage('paymentMethod is required')
        .isIn(['cash', 'bank_transfer', 'credit_card'])
        .withMessage('Invalid payment method'),
    body('guestEmail').optional({ nullable: true }).isEmail().withMessage('Invalid guest email')
];

const orderNumberValidation = [
    param('orderNumber').trim().notEmpty().withMessage('orderNumber is required')
];

module.exports = {
    previewCheckoutValidation,
    placeOrderValidation,
    orderNumberValidation
};

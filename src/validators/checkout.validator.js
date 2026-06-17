const { body, param } = require('express-validator');

const checkoutInformationValidation = [
    body('information.addressId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID địa chỉ không hợp lệ'),
    body('information.saveAddress').optional().isBoolean().withMessage('Lưu địa chỉ phải là giá trị boolean'),

    body('information.fullName')
        .if((value, { req }) => !req.body?.information?.addressId)
        .trim()
        .notEmpty()
        .withMessage('Họ và tên là bắt buộc'),
    body('information.phone')
        .if((value, { req }) => !req.body?.information?.addressId)
        .trim()
        .notEmpty()
        .withMessage('Số điện thoại là bắt buộc'),
    body('information.deliveryType')
        .optional()
        .isIn(['campus', 'home'])
        .withMessage('Phương thức giao hàng phải là campus hoặc home'),
    body('information.street')
        .if((value, { req }) => !req.body?.information?.addressId)
        .trim()
        .notEmpty()
        .withMessage('Địa chỉ chi tiết là bắt buộc'),
    body('information.city')
        .if((value, { req }) => !req.body?.information?.addressId)
        .trim()
        .notEmpty()
        .withMessage('Thành phố là bắt buộc'),
    body('information.state')
        .if((value, { req }) => !req.body?.information?.addressId)
        .trim()
        .notEmpty()
        .withMessage('Tỉnh/Thành phố là bắt buộc'),
    body('information.postalCode')
        .optional({ nullable: true })
        .trim(),
    body('information.studentId').optional().isString(),
    body('information.coupon')
        .optional()
        .isIn(['', 'NEW2024', 'FREESHIP', 'LABKIT'])
        .withMessage('Mã giảm giá không hợp lệ'),
    body('information.discountCode').optional().isString(),
    body('information.appliedDiscountCode').optional().isString(),
    body('information.userCouponCode').optional().isString(),
    body('information.pointsToRedeem').optional().isInt({ min: 0 })
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

const requestReturnValidation = [
    ...orderNumberValidation,
    body('reason').trim().notEmpty().withMessage('Lý do trả hàng là bắt buộc')
];

module.exports = {
    previewCheckoutValidation,
    placeOrderValidation,
    orderNumberValidation,
    requestReturnValidation
};

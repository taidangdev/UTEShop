const express = require('express');
const userController = require('../controllers/user.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { body } = require('express-validator');
const { validate } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(verifyToken);

const editProfileValidation = [
    body('otp')
        .notEmpty().withMessage('OTP là bắt buộc')
        .matches(/^\d{6}$/).withMessage('OTP phải có đúng 6 chữ số'),
    body('fullName').optional().isString().withMessage('FullName must be a string'),
    body('phone').optional().isString().withMessage('Phone must be a string'),
    body('address').optional().isString().withMessage('Address must be a string')
];

router.get('/me', requirePermission('profile:read'), userController.getMe);

router.get('/me/orders', requirePermission('orders:read'), userController.getMyOrders);

router.get('/me/reviews', requirePermission('profile:read'), userController.getMyReviews);

router.get('/me/points', requirePermission('profile:read'), userController.getMyPoints);

router.get('/me/coupons', requirePermission('profile:read'), userController.getMyCoupons);

router.post(
    '/profile/request-otp',
    requirePermission('profile:update'),
    userController.requestEditProfileOtp
);

router.put(
    '/profile',
    requirePermission('profile:update'),
    editProfileValidation,
    validate,
    userController.editProfile
);

const addressValidation = [
    body('recipientName').trim().notEmpty().withMessage('Tên người nhận là bắt buộc'),
    body('phone').trim().notEmpty().withMessage('Số điện thoại là bắt buộc'),
    body('line1').trim().notEmpty().withMessage('Địa chỉ chi tiết là bắt buộc'),
    body('city').trim().notEmpty().withMessage('Tỉnh/Thành phố là bắt buộc'),
    body('district').optional().isString(),
    body('line2').optional().isString(),
    body('ward').optional().isString(),
    body('label').optional().isIn(['home', 'campus', 'work', 'other']).withMessage('Nhãn không hợp lệ'),
    body('isDefault').optional().isBoolean()
];

router.get('/me/addresses', requirePermission('profile:read'), userController.getMyAddresses);
router.post('/me/addresses', requirePermission('profile:update'), addressValidation, validate, userController.createAddress);
router.put('/me/addresses/:id/default', requirePermission('profile:update'), userController.setDefaultAddress);
router.delete('/me/addresses/:id', requirePermission('profile:update'), userController.deleteAddress);

module.exports = router;

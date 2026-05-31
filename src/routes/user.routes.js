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

module.exports = router;

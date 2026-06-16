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

// --- Consignments ---
const consignmentController = require('../controllers/consignment.controller');

const consignmentValidation = [
    body('title').notEmpty().withMessage('Tiêu đề ký gửi là bắt buộc'),
    body('categoryId').isInt().withMessage('Danh mục ký gửi không hợp lệ'),
    body('suggestedPrice').isFloat({ min: 0 }).withMessage('Giá đề xuất phải là số dương'),
    body('condition')
        .isIn(['new', 'like_new', 'used', 'refurbished'])
        .withMessage('Tình trạng sản phẩm không hợp lệ'),
    body('contactPhone')
        .optional({ nullable: true, checkFalsy: true })
        .isString()
        .withMessage('Số điện thoại liên hệ phải là chuỗi ký tự'),
    body('images').optional().isArray().withMessage('Danh sách hình ảnh phải là một mảng')
];

router.get(
    '/me/consignments',
    requirePermission('consignments:read'),
    consignmentController.getMyConsignments
);

router.get(
    '/me/consignments/form-options',
    requirePermission('consignments:read'),
    consignmentController.getFormOptions
);

router.post(
    '/me/consignments',
    requirePermission('consignments:write'),
    consignmentValidation,
    validate,
    consignmentController.createConsignment
);

router.put(
    '/me/consignments/:id',
    requirePermission('consignments:write'),
    consignmentValidation,
    validate,
    consignmentController.updateConsignment
);

router.delete(
    '/me/consignments/:id',
    requirePermission('consignments:write'),
    consignmentController.deleteConsignment
);

module.exports = router;

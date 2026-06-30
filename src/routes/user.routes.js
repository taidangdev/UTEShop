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
    body('phone')
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage('Phone must be a string')
        .matches(/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/).withMessage('Số điện thoại không đúng định dạng Việt Nam'),
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

const changePasswordValidation = [
    body('otp')
        .notEmpty().withMessage('OTP là bắt buộc')
        .matches(/^\d{6}$/).withMessage('OTP phải có đúng 6 chữ số'),
    body('currentPassword')
        .notEmpty().withMessage('Mật khẩu hiện tại là bắt buộc'),
    body('newPassword')
        .notEmpty().withMessage('Mật khẩu mới là bắt buộc')
        .isLength({ min: 6 }).withMessage('Mật khẩu mới phải có ít nhất 6 ký tự')
];

router.post(
    '/profile/change-password/request-otp',
    requirePermission('profile:update'),
    userController.requestChangePasswordOtp
);

router.put(
    '/profile/change-password',
    requirePermission('profile:update'),
    changePasswordValidation,
    validate,
    userController.changePassword
);

const addressValidation = [
    body('recipientName').trim().notEmpty().withMessage('Tên người nhận là bắt buộc'),
    body('phone')
        .trim()
        .notEmpty().withMessage('Số điện thoại là bắt buộc')
        .matches(/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/).withMessage('Số điện thoại không đúng định dạng Việt Nam'),
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
router.put('/me/addresses/:id', requirePermission('profile:update'), addressValidation, validate, userController.updateAddress);
router.delete('/me/addresses/:id', requirePermission('profile:update'), userController.deleteAddress);

// --- Consignments ---
const consignmentController = require('../controllers/consignment.controller');

const consignmentValidation = [
    body('title')
        .notEmpty().withMessage('Tiêu đề ký gửi là bắt buộc')
        .isLength({ max: 100 }).withMessage('Tiêu đề ký gửi không được vượt quá 100 ký tự'),
    body('categoryId').isInt().withMessage('Danh mục ký gửi không hợp lệ'),
    body('suggestedPrice').isFloat({ min: 0 }).withMessage('Giá đề xuất phải là số dương'),
    body('condition')
        .isIn(['new', 'like_new', 'used', 'refurbished'])
        .withMessage('Tình trạng sản phẩm không hợp lệ'),
    body('contactPhone')
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage('Số điện thoại liên hệ phải là chuỗi ký tự')
        .matches(/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/).withMessage('Số điện thoại liên hệ không đúng định dạng Việt Nam'),
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

router.post(
    '/upload',
    requirePermission('consignments:write'),
    userController.uploadImage
);

router.delete(
    '/me/consignments/:id',
    requirePermission('consignments:write'),
    consignmentController.deleteConsignment
);

module.exports = router;


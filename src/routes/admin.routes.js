const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const { body } = require('express-validator');
const {
    listOrdersValidation,
    orderNumberParamValidation,
    updateOrderStatusValidation,
    updateOrderNoteValidation
} = require('../validators/adminOrder.validator');
const {
    listProductsValidation,
    productIdParamValidation,
    createProductValidation,
    updateProductValidation
} = require('../validators/adminProduct.validator');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/dashboard', adminController.getDashboard);
router.get('/orders', listOrdersValidation, validate, adminController.listOrders);
router.get(
    '/orders/:orderNumber',
    orderNumberParamValidation,
    validate,
    adminController.getOrderDetail
);
router.patch(
    '/orders/:orderNumber/status',
    updateOrderStatusValidation,
    validate,
    adminController.updateOrderStatus
);
router.patch(
    '/orders/:orderNumber/note',
    updateOrderNoteValidation,
    validate,
    adminController.updateOrderNote
);

router.get('/products/form-options', adminController.getProductFormOptions);
router.get('/products', listProductsValidation, validate, adminController.listProducts);
router.get(
    '/products/:id',
    productIdParamValidation,
    validate,
    adminController.getProductDetail
);
router.post('/products', createProductValidation, validate, adminController.createProduct);
router.patch(
    '/products/:id',
    updateProductValidation,
    validate,
    adminController.updateProduct
);
router.delete(
    '/products/:id',
    productIdParamValidation,
    validate,
    adminController.deleteProduct
);

// --- Consignments ---
const createConsignmentValidation = [
    body('userId')
        .notEmpty().withMessage('ID người gửi là bắt buộc')
        .isInt().withMessage('ID người gửi phải là số nguyên'),
    body('title')
        .notEmpty().withMessage('Tiêu đề ký gửi là bắt buộc')
        .isLength({ max: 100 }).withMessage('Tiêu đề ký gửi không được vượt quá 100 ký tự'),
    body('categoryId').isInt().withMessage('Danh mục ký gửi không hợp lệ'),
    body('suggestedPrice').isFloat({ min: 1000, max: 100000000 }).withMessage('Giá đề xuất phải từ 1.000 VNĐ đến 100.000.000 VNĐ'),
    body('condition')
        .isIn(['new', 'like_new', 'used', 'refurbished'])
        .withMessage('Tình trạng sản phẩm không hợp lệ'),
    body('contactPhone')
        .optional({ nullable: true, checkFalsy: true })
        .isString().withMessage('Số điện thoại liên hệ phải là chuỗi ký tự')
        .matches(/^(0|\+84|84)(3|5|7|8|9)[0-9]{8}$/).withMessage('Số điện thoại liên hệ không đúng định dạng Việt Nam'),
    body('images').optional().isArray().withMessage('Danh sách hình ảnh phải là một mảng'),
    body('status')
        .optional()
        .isIn(['PENDING', 'APPROVED_SHIPPING', 'RECEIVED', 'ON_SALE'])
        .withMessage('Trạng thái không hợp lệ'),
    body('approvedPrice')
        .optional({ nullable: true })
        .isFloat({ min: 0 }).withMessage('Giá duyệt bán phải là số lớn hơn hoặc bằng 0')
];

router.get('/consignments', adminController.listConsignments);
router.post('/consignments', createConsignmentValidation, validate, adminController.createConsignment);
router.patch('/consignments/:id', adminController.updateConsignment);
router.delete('/consignments/:id', adminController.deleteConsignment);

// Customer Management
router.get('/users', adminController.listUsers);
router.post('/users/bulk-status', adminController.bulkUpdateUserStatus);
router.get('/users/:id', adminController.getUserDetail);
router.put('/users/:id/status', adminController.updateUserStatus);
router.put('/users/:id/role', adminController.updateUserRole);

// Category CRUD
router.get('/categories', adminController.listCategories);
router.post('/categories', adminController.createCategory);
router.post('/categories/bulk-active', adminController.bulkActiveCategories);
router.post('/categories/bulk-delete', adminController.bulkDeleteCategories);
router.put('/categories/:id', adminController.updateCategory);
router.delete('/categories/:id', adminController.deleteCategory);

// Promotion CRUD
router.get('/promotions', adminController.listPromotions);
router.post('/promotions', adminController.createPromotion);
router.post('/promotions/bulk-active', adminController.bulkActivePromotions);
router.post('/promotions/bulk-delete', adminController.bulkDeletePromotions);
router.put('/promotions/:id', adminController.updatePromotion);
router.delete('/promotions/:id', adminController.deletePromotion);

module.exports = router;

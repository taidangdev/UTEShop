const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const {
    listOrdersValidation,
    orderNumberParamValidation,
    updateOrderStatusValidation
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
router.get('/consignments', adminController.listConsignments);
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

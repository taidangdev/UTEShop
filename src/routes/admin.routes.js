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

router.get('/users', adminController.listUsers);
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

module.exports = router;

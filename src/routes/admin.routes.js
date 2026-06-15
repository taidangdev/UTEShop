const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const {
    listOrdersValidation,
    orderNumberParamValidation,
    updateOrderStatusValidation
} = require('../validators/adminOrder.validator');

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

module.exports = router;

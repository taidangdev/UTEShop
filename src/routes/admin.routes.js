const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/users', adminController.listUsers);
router.get('/dashboard', adminController.getDashboard);

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

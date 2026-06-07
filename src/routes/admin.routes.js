const express = require('express');
const adminController = require('../controllers/admin.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/users', adminController.listUsers);
router.get('/dashboard', adminController.getDashboard);

module.exports = router;

const express = require('express');
const {
    listMajors,
    listCategories,
    listProducts,
    getProduct,
    getHome
} = require('../controllers/catalog.controller');
const { optionalVerifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/home', optionalVerifyToken, getHome);
router.get('/majors', listMajors);
router.get('/categories', listCategories);
router.get('/products', optionalVerifyToken, listProducts);
router.get('/products/:slug', optionalVerifyToken, getProduct);

module.exports = router;

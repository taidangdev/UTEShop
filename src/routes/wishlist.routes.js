const express = require('express');
const wishlistController = require('../controllers/wishlist.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verifyToken);

router.post('/toggle', wishlistController.toggleWishlist);
router.get('/', wishlistController.getWishlist);

module.exports = router;

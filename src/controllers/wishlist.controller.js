const wishlistService = require('../services/wishlist.service');
const { successResponse } = require('../utils/responseHandler');

const toggleWishlist = async (req, res, next) => {
    try {
        const { productId } = req.body;
        if (!productId) {
            const err = new Error('Product ID is required');
            err.statusCode = 400;
            throw err;
        }
        const userId = req.user.id;
        const result = await wishlistService.toggleWishlist(userId, Number(productId));
        return successResponse(res, 200, result.message, { isWishlisted: result.isWishlisted });
    } catch (error) {
        next(error);
    }
};

const getWishlist = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const products = await wishlistService.getWishlistProducts(userId);
        return successResponse(res, 200, 'OK', { products });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    toggleWishlist,
    getWishlist
};

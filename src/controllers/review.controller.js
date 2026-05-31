const reviewService = require('../services/review.service');
const { successResponse } = require('../utils/responseHandler');

const getEligible = async (req, res, next) => {
    try {
        const data = await reviewService.listEligibleItems(req.user.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const createReview = async (req, res, next) => {
    try {
        const data = await reviewService.createReview(req.user.id, req.body);
        return successResponse(res, 201, 'Review submitted successfully', data);
    } catch (error) {
        next(error);
    }
};

const listByProduct = async (req, res, next) => {
    try {
        const productId = Number(req.params.productId);
        const data = await reviewService.listProductReviews(productId, {
            page: req.query.page,
            limit: req.query.limit
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getEligible,
    createReview,
    listByProduct
};

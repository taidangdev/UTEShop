const express = require('express');
const reviewController = require('../controllers/review.controller');
const { verifyToken, requirePermission } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const {
    createReviewValidation,
    productReviewsQueryValidation
} = require('../validators/review.validator');

const router = express.Router();

router.get('/products/:productId', productReviewsQueryValidation, validate, reviewController.listByProduct);

router.use(verifyToken);

router.get('/eligible', requirePermission('reviews:create'), reviewController.getEligible);

router.post(
    '/',
    requirePermission('reviews:create'),
    createReviewValidation,
    validate,
    reviewController.createReview
);

module.exports = router;

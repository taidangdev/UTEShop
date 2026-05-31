const { body, param, query } = require('express-validator');

const createReviewValidation = [
    body('orderItemId').isInt({ min: 1 }).withMessage('orderItemId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('rating must be 1-5'),
    body('title').optional().isString().isLength({ max: 200 }),
    body('comment').optional().isString().isLength({ max: 5000 }),
    body('rewardType')
        .optional()
        .isIn(['points', 'coupon'])
        .withMessage('rewardType must be points or coupon')
];

const productReviewsQueryValidation = [
    param('productId').isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 50 })
];

module.exports = {
    createReviewValidation,
    productReviewsQueryValidation
};

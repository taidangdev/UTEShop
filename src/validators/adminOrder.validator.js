const { body, param, query } = require('express-validator');
const { ORDER_STATUSES } = require('../services/adminDashboard.service');

const listOrdersValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['all', ...ORDER_STATUSES])
        .withMessage('Invalid status filter'),
    query('search').optional().isString(),
    query('from').optional().isISO8601().withMessage('from must be a valid date'),
    query('to').optional().isISO8601().withMessage('to must be a valid date')
];

const orderNumberParamValidation = [
    param('orderNumber').trim().notEmpty().withMessage('orderNumber is required')
];

const updateOrderStatusValidation = [
    ...orderNumberParamValidation,
    body('status')
        .notEmpty()
        .withMessage('status is required')
        .isIn(ORDER_STATUSES)
        .withMessage('Invalid order status'),
    body('adminNote').optional({ nullable: true }).isString()
];

module.exports = {
    listOrdersValidation,
    orderNumberParamValidation,
    updateOrderStatusValidation
};

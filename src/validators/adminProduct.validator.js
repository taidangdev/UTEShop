const { body, param, query } = require('express-validator');
const {
    PRODUCT_STATUSES,
    PRODUCT_CONDITIONS,
    PRODUCT_TYPES
} = require('../services/adminProduct.service');

const listProductsValidation = [
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('status')
        .optional()
        .isIn(['all', ...PRODUCT_STATUSES])
        .withMessage('Invalid status filter'),
    query('search').optional().isString(),
    query('categoryId').optional().isInt({ min: 1 }).withMessage('categoryId must be a positive integer')
];

const productIdParamValidation = [
    param('id').isInt({ min: 1 }).withMessage('Product id must be a positive integer')
];

const productImageValidation = [
    body('images.*.url').optional().isString().trim().notEmpty().withMessage('Image url is required'),
    body('images.*.altText').optional({ nullable: true }).isString(),
    body('images.*.sortOrder').optional().isInt({ min: 0 }),
    body('images.*.isPrimary').optional().isBoolean()
];

const createProductValidation = [
    body('categoryId').isInt({ min: 1 }).withMessage('categoryId is required'),
    body('name').trim().notEmpty().withMessage('name is required').isLength({ max: 255 }),
    body('slug').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
    body('sku').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
    body('shortDescription').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('description').optional({ nullable: true }).isString(),
    body('price').isFloat({ min: 0 }).withMessage('price must be a non-negative number'),
    body('compareAtPrice')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('compareAtPrice must be a non-negative number'),
    body('costPrice')
        .optional({ nullable: true })
        .isFloat({ min: 0 })
        .withMessage('costPrice must be a non-negative number'),
    body('stockQuantity').isInt({ min: 0 }).withMessage('stockQuantity must be a non-negative integer'),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('condition').optional().isIn(PRODUCT_CONDITIONS),
    body('productType').optional().isIn(PRODUCT_TYPES),
    body('status').optional().isIn(PRODUCT_STATUSES),
    body('isFeatured').optional().isBoolean(),
    body('weightGrams').optional({ nullable: true }).isInt({ min: 0 }),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    body('attributes').optional().isObject(),
    body('majorIds').optional().isArray(),
    body('majorIds.*').optional().isInt({ min: 1 }),
    ...productImageValidation
];

const updateProductValidation = [
    ...productIdParamValidation,
    body('categoryId').optional().isInt({ min: 1 }),
    body('name').optional().trim().notEmpty().isLength({ max: 255 }),
    body('slug').optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
    body('sku').optional({ nullable: true }).isString().trim().isLength({ max: 50 }),
    body('shortDescription').optional({ nullable: true }).isString().isLength({ max: 500 }),
    body('description').optional({ nullable: true }).isString(),
    body('price').optional().isFloat({ min: 0 }),
    body('compareAtPrice').optional({ nullable: true }).isFloat({ min: 0 }),
    body('costPrice').optional({ nullable: true }).isFloat({ min: 0 }),
    body('stockQuantity').optional().isInt({ min: 0 }),
    body('lowStockThreshold').optional().isInt({ min: 0 }),
    body('condition').optional().isIn(PRODUCT_CONDITIONS),
    body('productType').optional().isIn(PRODUCT_TYPES),
    body('status').optional().isIn(PRODUCT_STATUSES),
    body('isFeatured').optional().isBoolean(),
    body('weightGrams').optional({ nullable: true }).isInt({ min: 0 }),
    body('tags').optional().isArray(),
    body('tags.*').optional().isString(),
    body('attributes').optional().isObject(),
    body('majorIds').optional().isArray(),
    body('majorIds.*').optional().isInt({ min: 1 }),
    ...productImageValidation
];

module.exports = {
    listProductsValidation,
    productIdParamValidation,
    createProductValidation,
    updateProductValidation
};

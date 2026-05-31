const catalogService = require('../services/catalog.service');
const { Major } = require('../models');
const { successResponse } = require('../utils/responseHandler');

const listMajors = async (req, res, next) => {
    try {
        const majors = await Major.findAll({
            where: { isActive: true },
            order: [['sortOrder', 'ASC'], ['name', 'ASC']],
            attributes: ['id', 'code', 'name']
        });
        return successResponse(res, 200, 'OK', { majors });
    } catch (error) {
        next(error);
    }
};

const listCategories = async (req, res, next) => {
    try {
        const data = await catalogService.listCategoriesWithCounts();
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const listProducts = async (req, res, next) => {
    try {
        const { q, category, majorId, sort, page, limit } = req.query;
        const data = await catalogService.listProducts({
            q,
            categorySlug: category,
            majorId: majorId ? Number(majorId) : undefined,
            sort,
            page,
            limit,
            userId: req.user?.id
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getProduct = async (req, res, next) => {
    try {
        const data = await catalogService.getProductBySlug(req.params.slug, req.user?.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getHome = async (req, res, next) => {
    try {
        const data = await catalogService.getHomePageData(req.user?.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

module.exports = { listMajors, listCategories, listProducts, getProduct, getHome };

const User = require('../models/user.model');
const { successResponse } = require('../utils/responseHandler');
const adminDashboardService = require('../services/adminDashboard.service');
const adminOrderService = require('../services/adminOrder.service');
const adminProductService = require('../services/adminProduct.service');
const adminConsignmentService = require('../services/adminConsignment.service');

/**
 * Ví dụ endpoint chỉ admin: danh sách user (phân quyền qua route).
 */
const listUsers = async (req, res, next) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'role', 'status', 'createdAt']
        });
        return successResponse(res, 200, 'Danh sách người dùng', { users });
    } catch (error) {
        next(error);
    }
};

const getDashboard = async (req, res, next) => {
    try {
        const data = await adminDashboardService.getAdminDashboardStats({
            from: req.query.from,
            to: req.query.to,
            preset: req.query.preset,
            groupBy: req.query.groupBy,
            status: req.query.status
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const listOrders = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? undefined : req.query.status;
        const data = await adminOrderService.listOrders({
            page: req.query.page,
            limit: req.query.limit,
            status,
            search: req.query.search,
            from: req.query.from,
            to: req.query.to
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getOrderDetail = async (req, res, next) => {
    try {
        const data = await adminOrderService.getOrderDetail(req.params.orderNumber);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const updateOrderStatus = async (req, res, next) => {
    try {
        const data = await adminOrderService.updateOrderStatus(req.params.orderNumber, {
            status: req.body.status,
            adminNote: req.body.adminNote
        });
        return successResponse(res, 200, 'Order status updated', data);
    } catch (error) {
        next(error);
    }
};

const listProducts = async (req, res, next) => {
    try {
        const status = req.query.status === 'all' ? undefined : req.query.status;
        const data = await adminProductService.listProducts({
            page: req.query.page,
            limit: req.query.limit,
            status,
            search: req.query.search,
            categoryId: req.query.categoryId
        });
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getProductFormOptions = async (req, res, next) => {
    try {
        const data = await adminProductService.getFormOptions();
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const getProductDetail = async (req, res, next) => {
    try {
        const data = await adminProductService.getProductById(req.params.id);
        return successResponse(res, 200, 'OK', data);
    } catch (error) {
        next(error);
    }
};

const createProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.createProduct(req.body);
        return successResponse(res, 201, 'Product created', data);
    } catch (error) {
        next(error);
    }
};

const updateProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.updateProduct(req.params.id, req.body);
        return successResponse(res, 200, 'Product updated', data);
    } catch (error) {
        next(error);
    }
};

const deleteProduct = async (req, res, next) => {
    try {
        const data = await adminProductService.deleteProduct(req.params.id);
        return successResponse(res, 200, 'Product archived', data);
    } catch (error) {
        next(error);
    }
};

const listConsignments = async (req, res, next) => {
    try {
        const { page, limit, status, search } = req.query;
        const data = await adminConsignmentService.listConsignments({ page, limit, status, search });
        return successResponse(res, 200, 'Danh sách ký gửi', data);
    } catch (error) {
        next(error);
    }
};

const updateConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await adminConsignmentService.updateConsignment(Number(id), req.body);
        return successResponse(res, 200, 'Cập nhật yêu cầu ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

const deleteConsignment = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = await adminConsignmentService.deleteConsignment(Number(id));
        return successResponse(res, 200, data.message || 'Xóa ký gửi thành công', data);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listUsers,
    getDashboard,
    listOrders,
    getOrderDetail,
    updateOrderStatus,
    listProducts,
    getProductFormOptions,
    getProductDetail,
    createProduct,
    updateProduct,
    deleteProduct,
    listConsignments,
    updateConsignment,
    deleteConsignment
};

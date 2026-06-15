const User = require('../models/user.model');
const { successResponse } = require('../utils/responseHandler');
const adminDashboardService = require('../services/adminDashboard.service');
const adminOrderService = require('../services/adminOrder.service');

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

module.exports = {
    listUsers,
    getDashboard,
    listOrders,
    getOrderDetail,
    updateOrderStatus
};

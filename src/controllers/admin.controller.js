const User = require('../models/user.model');
const { successResponse } = require('../utils/responseHandler');
const adminDashboardService = require('../services/adminDashboard.service');

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

module.exports = {
    listUsers,
    getDashboard
};

const notificationService = require('../services/notification.service');
const { successResponse } = require('../utils/responseHandler');

const getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { limit = 20, offset = 0 } = req.query;
        const data = await notificationService.getUserNotifications(userId, limit, offset);
        return successResponse(res, 200, 'Lấy danh sách thông báo thành công', data);
    } catch (error) {
        next(error);
    }
};

const markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const notification = await notificationService.markAsRead(Number(id), userId);
        return successResponse(res, 200, 'Đã đánh dấu đọc thông báo', { notification });
    } catch (error) {
        next(error);
    }
};

const markAllAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        await notificationService.markAllAsRead(userId);
        return successResponse(res, 200, 'Đã đánh dấu đọc tất cả thông báo');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    markAllAsRead
};

const express = require('express');
const notificationController = require('../controllers/notification.controller');
const { verifyToken, authorizeRoles } = require('../middlewares/auth.middleware');
const notificationService = require('../services/notification.service');
const { successResponse } = require('../utils/responseHandler');

const router = express.Router();

// Tất cả các route bên dưới yêu cầu đăng nhập
router.use(verifyToken);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

/**
 * API Mock: Admin tạo bài viết mới -> Phát thông báo realtime + gửi Email cho tất cả user active
 */
router.post('/mock-post', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            const err = new Error('Title and content are required');
            err.statusCode = 400;
            throw err;
        }

        const notification = await notificationService.createNotification({
            userId: null, // Gửi cho tất cả
            title: `📰 Bài viết mới: ${title}`,
            content: content,
            type: 'post_new',
            relatedId: 'mock_post_id',
            emailOptions: {
                targetRole: 'all', // Gửi mail cho tất cả user active
                subject: `[UTEShop] Bài viết mới: ${title}`,
                message: `Chào bạn,\n\nChúng tôi vừa đăng một bài viết mới: "${title}"\n\nNội dung: ${content}\n\nTrân trọng,\nBan quản trị UTEShop`,
                html: `<h3>Chào bạn,</h3><p>Chúng tôi vừa đăng một bài viết mới: <strong>"${title}"</strong></p><p>Nội dung: ${content}</p><p>Trân trọng,<br>Ban quản trị UTEShop</p>`
            }
        });

        return successResponse(res, 201, 'Mock bài viết mới & phát thông báo thành công', { notification });
    } catch (error) {
        next(error);
    }
});

/**
 * API Mock: Admin tạo sự kiện mới -> Phát thông báo realtime + gửi Email cho tất cả user active
 */
router.post('/mock-event', authorizeRoles('admin'), async (req, res, next) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            const err = new Error('Title and content are required');
            err.statusCode = 400;
            throw err;
        }

        const notification = await notificationService.createNotification({
            userId: null, // Gửi cho tất cả
            title: `📅 Sự kiện mới: ${title}`,
            content: content,
            type: 'event_new',
            relatedId: 'mock_event_id',
            emailOptions: {
                targetRole: 'all', // Gửi mail cho tất cả user active
                subject: `[UTEShop] Sự kiện mới: ${title}`,
                message: `Chào bạn,\n\nCó một sự kiện mới sắp diễn ra: "${title}"\n\nNội dung: ${content}\n\nTrân trọng,\nBan quản trị UTEShop`,
                html: `<h3>Chào bạn,</h3><p>Có một sự kiện mới sắp diễn ra: <strong>"${title}"</strong></p><p>Nội dung: ${content}</p><p>Trân trọng,<br>Ban quản trị UTEShop</p>`
            }
        });

        return successResponse(res, 201, 'Mock sự kiện mới & phát thông báo thành công', { notification });
    } catch (error) {
        next(error);
    }
});

module.exports = router;

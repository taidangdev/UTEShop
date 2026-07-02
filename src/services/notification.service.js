const { Notification, User } = require('../models');
const socketService = require('./socket.service');
const sendEmail = require('../utils/sendEmail');

/**
 * Gửi email thông báo ngầm
 */
const sendEmailNotification = async ({ email, subject, message, html }) => {
    try {
        await sendEmail({ email, subject, message, html });
        console.log(`✉️ Email notification sent successfully to ${email}`);
    } catch (error) {
        console.error(`❌ Failed to send email to ${email}:`, error.message);
    }
};

/**
 * Tạo thông báo mới: Lưu DB -> Phát socket realtime -> Gửi mail thông báo
 */
const createNotification = async ({ userId, title, content, type, relatedId, emailOptions = null }) => {
    try {
        // 1. Lưu vào cơ sở dữ liệu
        const notification = await Notification.create({
            userId,
            title,
            content,
            type,
            relatedId,
            isRead: false
        });

        // 2. Phát sự kiện realtime qua socket
        if (userId) {
            // Gửi tới user cụ thể
            socketService.sendToUser(userId, 'new_notification', notification);
        } else {
            // Gửi tới Admin hoặc tất cả người dùng
            if (type === 'order_new' || type === 'review_new' || type === 'consignment_new') {
                socketService.sendToAdmins('new_notification', notification);
            } else {
                // Bài viết mới, sự kiện mới -> Broadcast cho tất cả
                socketService.broadcast('new_notification', notification);
            }
        }

        // 3. Gửi email thông báo (nếu có tùy chọn email)
        if (emailOptions) {
            if (emailOptions.email) {
                sendEmailNotification(emailOptions);
            } else if (emailOptions.targetRole === 'admin') {
                // Đã tắt cơ chế gửi email cho Admin để tránh lỗi gửi đến các email nội bộ ảo (.local)
            } else if (emailOptions.targetRole === 'all') {
                // Newsletter gửi cho toàn bộ người dùng active
                const users = await User.findAll({ where: { status: 'active' } });
                users.forEach(user => {
                    if (user.email) {
                        sendEmailNotification({
                            email: user.email,
                            subject: emailOptions.subject,
                            message: emailOptions.message,
                            html: emailOptions.html
                        });
                    }
                });
            }
        }

        return notification;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        throw error;
    }
};

/**
 * Lấy danh sách thông báo của user (bao gồm cả thông báo hệ thống userId = null)
 */
const getUserNotifications = async (userId, limit = 20, offset = 0) => {
    const { Op } = require('sequelize');
    
    // Tìm các thông báo thuộc về user này, hoặc thông báo hệ thống (userId = null)
    // Đối với thông báo hệ thống (như post_new, event_new), ai cũng nhìn thấy
    return await Notification.findAndCountAll({
        where: {
            [Op.or]: [
                { userId },
                { userId: null }
            ]
        },
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
    });
};

/**
 * Đánh dấu một thông báo là đã đọc
 */
const markAsRead = async (notificationId, userId) => {
    const notification = await Notification.findByPk(notificationId);
    if (!notification) {
        const err = new Error('Notification not found');
        err.statusCode = 404;
        throw err;
    }

    // Đảm bảo user chỉ được cập nhật thông báo của chính họ
    // (Nếu là thông báo hệ thống userId = null thì vẫn cho phép cập nhật hoặc có thể tạo một bảng liên kết để check đã đọc)
    // Tạm thời, cập nhật isRead trực tiếp trên bản ghi thông báo
    if (notification.userId && notification.userId !== userId) {
        const err = new Error('Forbidden');
        err.statusCode = 403;
        throw err;
    }

    await notification.update({ isRead: true });
    return notification;
};

/**
 * Đánh dấu toàn bộ thông báo của user là đã đọc
 */
const markAllAsRead = async (userId) => {
    const { Op } = require('sequelize');
    await Notification.update(
        { isRead: true },
        {
            where: {
                [Op.or]: [
                    { userId },
                    { userId: null }
                ],
                isRead: false
            }
        }
    );
    return { success: true };
};

module.exports = {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead
};

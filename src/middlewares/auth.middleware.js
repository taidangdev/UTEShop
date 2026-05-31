const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { errorResponse } = require('../utils/responseHandler');
const { PERMISSIONS_BY_ROLE } = require('../config/permissions');

const verifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return errorResponse(res, 401, 'Unauthorized — missing Bearer token');
        }

        const token = authHeader.slice(7);
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        const userId = decoded.sub;
        const user = await User.findByPk(userId);

        if (!user) {
            return errorResponse(res, 401, 'Unauthorized — user not found');
        }

        if (user.status === 'banned') {
            return errorResponse(res, 403, 'Tài khoản đã bị khóa');
        }

        if (user.status !== 'active') {
            return errorResponse(res, 403, 'Tài khoản chưa kích hoạt hoặc không khả dụng');
        }

        req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            status: user.status
        };

        next();
    } catch (err) {
        if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
            return errorResponse(res, 401, 'Invalid or expired access token');
        }
        next(err);
    }
};

const optionalVerifyToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice(7);
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const userId = decoded.sub;
            const user = await User.findByPk(userId);
            if (user && user.status === 'active') {
                req.user = {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: user.status
                };
            }
        }
    } catch (err) {
        // Ignore token errors for guest experience
    }
    next();
};

/**
 * Cho phép chỉ các role được liệt kê (ví dụ authorizeRoles('admin')).
 */
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, 401, 'Unauthorized');
    }
    if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(res, 403, 'Forbidden — insufficient role');
    }
    next();
};

/**
 * Kiểm tra quyền theo danh sách permission trong config/permissions.js.
 * Role admin được coi là có mọi quyền.
 */
const requirePermission = (...requiredPermissions) => (req, res, next) => {
    if (!req.user) {
        return errorResponse(res, 401, 'Unauthorized');
    }

    const { role } = req.user;
    if (role === 'admin') {
        return next();
    }

    const allowed = PERMISSIONS_BY_ROLE[role] || [];
    const hasAll = requiredPermissions.every((p) => allowed.includes(p));

    if (!hasAll) {
        return errorResponse(res, 403, 'Forbidden — missing permission');
    }

    next();
};

module.exports = {
    verifyToken,
    optionalVerifyToken,
    authorizeRoles,
    requirePermission
};

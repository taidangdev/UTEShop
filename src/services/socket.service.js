const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

let io = null;
const userSockets = new Map(); // userId -> Set of socketIds

const init = (server, corsOptions) => {
    io = new Server(server, {
        cors: corsOptions || {
            origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
            credentials: true
        }
    });

    // Middleware authenticate socket connection
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.query?.token;
            if (!token) {
                // Allow guest connections, but they won't have userId
                return next();
            }

            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
            const userId = decoded.sub;

            // Fetch user to verify status and role
            const user = await User.findByPk(userId);
            if (!user || user.status !== 'active') {
                return next(new Error('Authentication failed: User is inactive or not found'));
            }

            socket.user = {
                id: user.id,
                role: user.role,
                email: user.email,
                username: user.username
            };
            next();
        } catch (err) {
            return next(new Error('Authentication failed: Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user?.id;
        const userRole = socket.user?.role;

        console.log(`🔌 Client connected: ${socket.id} (User: ${userId || 'Guest'}, Role: ${userRole || 'None'})`);

        if (userId) {
            // Add connection to tracking map
            if (!userSockets.has(userId)) {
                userSockets.set(userId, new Set());
            }
            userSockets.get(userId).add(socket.id);

            // Join personal user room
            socket.join(`user:${userId}`);

            // Join admin room if role is admin
            if (userRole === 'admin') {
                socket.join('admins');
                console.log(`🛡️ Admin ${userId} joined admins room`);
            }
        }

        socket.on('disconnect', () => {
            console.log(`❌ Client disconnected: ${socket.id}`);
            if (userId && userSockets.has(userId)) {
                const sockets = userSockets.get(userId);
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);
                }
            }
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io has not been initialized. Please call init(server) first.');
    }
    return io;
};

/**
 * Gửi sự kiện realtime tới một user cụ thể
 */
const sendToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

/**
 * Gửi sự kiện realtime tới tất cả các Admin
 */
const sendToAdmins = (event, data) => {
    if (io) {
        io.to('admins').emit(event, data);
    }
};

/**
 * Phát (Broadcast) sự kiện tới tất cả các clients đang kết nối
 */
const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};

/**
 * Kiểm tra xem một user có đang online không
 */
const isUserOnline = (userId) => {
    return userSockets.has(userId);
};

module.exports = {
    init,
    getIO,
    sendToUser,
    sendToAdmins,
    broadcast,
    isUserOnline
};

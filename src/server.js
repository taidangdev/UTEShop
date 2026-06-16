require('dotenv').config();
const http = require('http');
const app = require('./app');

// Import config
const sequelize = require('./config/db');
const redisClient = require('./config/redis');
const socketService = require('./services/socket.service');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        // 1. Kết nối Database MySQL
        await sequelize.authenticate();
        console.log('✅ MySQL (Docker) connected successfully.');

        const { syncDatabase } = require('./models');
        const { ensureSchema } = require('./utils/ensureSchema');
        // Create base tables first, then run incremental schema patches.
        await syncDatabase({ alter: false });
        await ensureSchema(sequelize);
        console.log('✅ MySQL tables synchronized.');

        // 2. Kết nối Redis
        await redisClient.connect();
        console.log('✅ Redis (Docker) connected successfully.');

        // 3. Khởi tạo HTTP Server & Socket.io
        const server = http.createServer(app);
        socketService.init(server);
        console.log('✅ Socket.io initialized.');

        // 4. Khởi động Server
        server.listen(PORT, () => {
            console.log(`🚀 Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
            
            // Khởi chạy scheduler tự động hủy đơn sau 24h nếu chưa thanh toán
            const { startAutoCancelScheduler } = require('./services/orderScheduler.service');
            startAutoCancelScheduler();
        });
    } catch (error) {
        console.error('❌ Failed to connect to services:', error);
        process.exit(1);
    }
};

startServer();


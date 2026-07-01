/**
 * Backdates an order's placedAt timestamp by 31 minutes (local/debug).
 * Usage: node src/scripts/backdateOrder.js [orderNumber]
 */
require('dotenv').config();
const sequelize = require('../config/db');
const { Order } = require('../models');

const orderNumber = process.argv[2];

const run = async () => {
    try {
        await sequelize.authenticate();
        let order;
        if (orderNumber) {
            order = await Order.findOne({ where: { orderNumber } });
        } else {
            // Find the latest order if no orderNumber is provided
            order = await Order.findOne({ order: [['id', 'DESC']] });
        }

        if (!order) {
            console.error('Không tìm thấy đơn hàng nào.');
            process.exit(1);
        }

        const thirtyOneMinsAgo = new Date(Date.now() - 31 * 60 * 1000);
        await order.update({ placedAt: thirtyOneMinsAgo });

        console.log(`✅ Đã chỉnh sửa placedAt của đơn hàng #${order.orderNumber} thành 31 phút trước (${thirtyOneMinsAgo.toLocaleString('vi-VN')}).`);
    } catch (e) {
        console.error(e.message || e);
        process.exitCode = 1;
    } finally {
        await sequelize.close().catch(() => {});
    }
};

run();

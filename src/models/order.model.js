const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define(
    'Order',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderNumber: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        guestEmail: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        guestPhone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        shippingAddressId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        shippingSnapshot: {
            type: DataTypes.JSON,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM(
                'pending',
                'confirmed',
                'processing',
                'shipping',
                'delivery_failed',
                'delivered',
                'return_requested',
                'return_approved',
                'returned',
                'cancelled',
                'refunded'
            ),
            allowNull: false,
            defaultValue: 'pending'
        },
        subtotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        discountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        appliedPromotionId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        promotionCode: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        shippingFee: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        total: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        note: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        adminNote: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        placedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        paidAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        shippedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deliveredAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        cancelledAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deliveryFailCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        returnedAt: {
            type: DataTypes.DATE,
            allowNull: true
        }
    },
    {
        tableName: 'orders',
        timestamps: true,
        indexes: [{ fields: ['userId', 'status'] }, { fields: ['orderNumber'], unique: true }]
    }
);

module.exports = Order;

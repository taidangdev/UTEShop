const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define(
    'OrderItem',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        variantId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        productName: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        sku: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        unitPrice: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        lineTotal: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        discountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    },
    {
        tableName: 'order_items',
        timestamps: true
    }
);

module.exports = OrderItem;

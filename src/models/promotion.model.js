const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Promotion = sequelize.define(
    'Promotion',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: true,
            unique: true
        },
        name: {
            type: DataTypes.STRING(150),
            allowNull: false
        },
        /** shop = whole cart; category = listed categories; product = listed products */
        scope: {
            type: DataTypes.ENUM('shop', 'category', 'product'),
            allowNull: false,
            defaultValue: 'shop'
        },
        description: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        type: {
            type: DataTypes.ENUM('percentage', 'fixed_amount', 'free_shipping'),
            allowNull: false
        },
        value: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        minOrderAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true
        },
        maxDiscountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true
        },
        /** @deprecated Prefer promotion_categories — kept for backward compatibility */
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        maxUsesPerUser: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        startsAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        endsAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        usageLimit: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        usedCount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true
        }
    },
    {
        tableName: 'promotions',
        timestamps: true
    }
);

module.exports = Promotion;

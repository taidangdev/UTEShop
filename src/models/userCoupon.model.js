const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const UserCoupon = sequelize.define(
    'UserCoupon',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true
        },
        source: {
            type: DataTypes.ENUM('review_reward', 'promotion', 'admin'),
            allowNull: false,
            defaultValue: 'review_reward'
        },
        reviewId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        discountType: {
            type: DataTypes.ENUM('percentage', 'fixed_amount', 'free_shipping'),
            allowNull: false,
            defaultValue: 'percentage'
        },
        discountValue: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false
        },
        minOrderAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: true,
            defaultValue: 0
        },
        expiresAt: {
            type: DataTypes.DATE,
            allowNull: false
        },
        isUsed: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        usedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        usedOnOrderId: {
            type: DataTypes.INTEGER,
            allowNull: true
        }
    },
    {
        tableName: 'user_coupons',
        timestamps: true,
        indexes: [
            { fields: ['userId', 'isUsed'] },
            { fields: ['code'], unique: true }
        ]
    }
);

module.exports = UserCoupon;

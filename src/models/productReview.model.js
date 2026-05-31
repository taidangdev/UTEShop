const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductReview = sequelize.define(
    'ProductReview',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        orderItemId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true
        },
        rating: {
            type: DataTypes.TINYINT,
            allowNull: false,
            validate: { min: 1, max: 5 }
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        comment: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected'),
            allowNull: false,
            defaultValue: 'pending'
        },
        rewardType: {
            type: DataTypes.ENUM('points', 'coupon'),
            allowNull: true
        },
        rewardGrantedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        rewardPayload: {
            type: DataTypes.JSON,
            allowNull: true
        }
    },
    {
        tableName: 'product_reviews',
        timestamps: true,
        indexes: [
            { fields: ['productId', 'status'] },
            { fields: ['userId'] },
            { unique: true, fields: ['orderItemId'] }
        ]
    }
);

module.exports = ProductReview;

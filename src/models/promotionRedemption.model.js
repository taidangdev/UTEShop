const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromotionRedemption = sequelize.define(
    'PromotionRedemption',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        promotionId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        discountAmount: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'promotion_redemptions',
        timestamps: true,
        updatedAt: false,
        indexes: [
            { fields: ['promotionId', 'userId'] },
            { fields: ['orderId'] }
        ]
    }
);

module.exports = PromotionRedemption;

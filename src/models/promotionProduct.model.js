const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromotionProduct = sequelize.define(
    'PromotionProduct',
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
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: 'promotion_products',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['promotionId', 'productId'] },
            { fields: ['productId'] }
        ]
    }
);

module.exports = PromotionProduct;

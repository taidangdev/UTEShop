const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromotionCategory = sequelize.define(
    'PromotionCategory',
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
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    },
    {
        tableName: 'promotion_categories',
        timestamps: true,
        indexes: [
            { unique: true, fields: ['promotionId', 'categoryId'] },
            { fields: ['categoryId'] }
        ]
    }
);

module.exports = PromotionCategory;

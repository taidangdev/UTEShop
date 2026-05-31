const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PointTransaction = sequelize.define(
    'PointTransaction',
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
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: 'Positive = earn, negative = spend'
        },
        balanceAfter: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        type: {
            type: DataTypes.ENUM(
                'review_reward',
                'checkout_redeem',
                'admin_adjust',
                'order_bonus'
            ),
            allowNull: false
        },
        referenceType: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        referenceId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        note: {
            type: DataTypes.STRING(255),
            allowNull: true
        }
    },
    {
        tableName: 'point_transactions',
        timestamps: true,
        updatedAt: false,
        indexes: [{ fields: ['userId', 'createdAt'] }]
    }
);

module.exports = PointTransaction;

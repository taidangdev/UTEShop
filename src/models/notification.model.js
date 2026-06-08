const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define(
    'Notification',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true // null means it's a global notification or targeted for admin
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING(50),
            allowNull: false // e.g. 'order_new', 'review_new', 'post_new', 'event_new', 'order_status_update'
        },
        relatedId: {
            type: DataTypes.STRING(50),
            allowNull: true // references orderNumber or primaryKey of target item
        },
        isRead: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        }
    },
    {
        tableName: 'notifications',
        timestamps: true,
        indexes: [
            { fields: ['userId'] },
            { fields: ['isRead'] }
        ]
    }
);

module.exports = Notification;

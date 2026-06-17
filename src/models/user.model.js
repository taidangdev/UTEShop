const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        fullName: {
            type: DataTypes.STRING,
            allowNull: true
        },
        phone: {
            type: DataTypes.STRING,
            allowNull: true
        },
        address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        role: {
            type: DataTypes.ENUM('admin', 'customer'),
            defaultValue: 'customer'
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'banned'),
            defaultValue: 'inactive'
        },
        majorId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        studentId: {
            type: DataTypes.STRING(20),
            allowNull: true
        },
        avatarUrl: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        emailVerifiedAt: {
            type: DataTypes.DATE,
            allowNull: true
        },
        loyaltyPoints: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    },
    {
        tableName: 'users',
        timestamps: true
    }
);

module.exports = User;

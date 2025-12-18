const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    hashedPassword: { type: DataTypes.STRING, allowNull: false },
    displayName: { type: DataTypes.STRING, allowNull: false },
    avatar: { type: DataTypes.STRING, allowNull: true },
    bio: { type: DataTypes.TEXT, allowNull: true },
    phone: { type: DataTypes.STRING, allowNull: true }
},
    {
        timestamps: true,
        tableName: 'users'
    }
);

module.exports = User;
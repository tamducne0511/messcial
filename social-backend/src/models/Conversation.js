const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Conversation = sequelize.define('Conversation', {
    type: {
        type: DataTypes.ENUM('direct', 'group'),
        allowNull: false,
        defaultValue: 'direct'
    },
    lastMessageId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true,
    }
}, {
    timestamps: true,
    tableName: 'conversations'
});

module.exports = Conversation;
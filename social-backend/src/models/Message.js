const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
    content: { type: DataTypes.TEXT, allowNull: false },
    senderId: { type: DataTypes.INTEGER, allowNull: false },
    messageType: {
        type: DataTypes.ENUM('text', 'image', 'audio', 'video'),
        allowNull: false,
        defaultValue: 'text'
    },
}, {
    timestamps: true,
    tableName: 'messages'
});

module.exports = Message;
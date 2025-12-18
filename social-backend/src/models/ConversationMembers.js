const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const ConversationMembers = sequelize.define('ConversationMembers', {
    conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        allowNull: false,
        defaultValue: 'member'
    }
}, {
    timestamps: true,
    tableName: 'conversation_members'
});

module.exports = ConversationMembers;
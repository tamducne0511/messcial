const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Notification = sequelize.define('Notification', {
    type: {
        type: DataTypes.ENUM('friend_request', 'comment', 'like', 'follow', 'post'),
        allowNull: false
    },
    content: {
        type: DataTypes.STRING,
        allowNull: false
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    timestamps: true,
    tableName: 'notifications'
})
//thông báo thuộc về người nhận
Notification.belongsTo(User, {
    foreignKey: 'userId',
    as: 'receiver'
});
//người nhận có nhiều thông báo
User.hasMany(Notification, {
    foreignKey: 'userId',
    as: 'notifications'
});
//Người gưi có nhiều thông báo
User.hasMany(Notification, {
    foreignKey: 'senderId',
    as: 'sentNotifications'
});
//thông báo thuộc về người gửi
Notification.belongsTo(User, {
    foreignKey: 'senderId',
    as: 'sender'
});

module.exports = Notification;
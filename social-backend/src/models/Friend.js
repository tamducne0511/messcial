const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Friend = sequelize.define('Friend', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'declined'),
        allowNull: false,
        defaultValue: 'pending'
    }
}, {
    timestamps: true,
    tableName: 'friends'
});
// Relation helper để dễ include
Friend.belongsTo(User, { foreignKey: 'userId', as: 'requester' }); // người gửi lời mời
Friend.belongsTo(User, { foreignKey: 'friendId', as: 'receiver' }); // người nhận lời mời

module.exports = Friend;
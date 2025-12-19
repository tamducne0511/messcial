const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');

const Post = sequelize.define('Post', {
    content: { type: DataTypes.TEXT, allowNull: false },
    privacy: { type: DataTypes.ENUM('public', 'friends', 'private'), defaultValue: 'public' },
    sharedPostId: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
}, {
    timestamps: true,
    tableName: 'posts'
})
Post.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Post, { foreignKey: 'userId' });
module.exports = Post;
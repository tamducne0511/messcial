const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Post = require('./Post');

const PostMedia = sequelize.define('PostMedia', {
    url: { type: DataTypes.STRING, allowNull: false },
    type: { type: DataTypes.ENUM('image', 'video'), allowNull: false }
}, {
    timestamps: true,
    tableName: 'post_media'
});
PostMedia.belongsTo(Post, { foreignKey: 'postId' });
Post.hasMany(PostMedia, { foreignKey: 'postId' });

module.exports = PostMedia;
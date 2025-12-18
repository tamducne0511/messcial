const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");
const Post = require("./Post");

const Comment = sequelize.define("Comment", {
    content: { type: DataTypes.TEXT, allowNull: false },
    parentId: { type: DataTypes.INTEGER, allowNull: true },
}, {
    timestamps: true,
    tableName: "comments",
});

Comment.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Comment, { foreignKey: "userId" });

Comment.belongsTo(Post, { foreignKey: "postId" });
Post.hasMany(Comment, { foreignKey: "postId" });

// Self-referencing relationship for replies
Comment.hasMany(Comment, { foreignKey: "parentId", as: "replies" });
Comment.belongsTo(Comment, { foreignKey: "parentId", as: "parent" });

module.exports = Comment;

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const User = require("./User");
const Post = require("./Post");
const Comment = require("./Comment");

const Reaction = sequelize.define("Reaction", {
    type: {
        type: DataTypes.ENUM("like", "love", "haha", "angry", "sad", "wow"),
        allowNull: false
    },
}, {
    timestamps: true,
    tableName: "reactions",
});

Reaction.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Reaction, { foreignKey: "userId" });

Reaction.belongsTo(Post, { foreignKey: "postId" });
Post.hasMany(Reaction, { foreignKey: "postId" });

Reaction.belongsTo(Comment, { foreignKey: "commentId" });
Comment.hasMany(Reaction, { foreignKey: "commentId" });

module.exports = Reaction;

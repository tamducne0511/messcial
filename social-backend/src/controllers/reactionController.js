const Reaction = require('../models/Reaction');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { createNotification } = require('../utils/notificationHelper');
//Thêm 1 phản ứng
const reactPost = async (req, res) => {
    try {
        const userId = req.userId;
        const postId = req.params.postId;
        const { type } = req.body;
        //Kiểm tra bài post có hay không 
        const post = await Post.findByPk(postId, {
            attributes: ['id', 'userId']
        });
        if (!post) {
            return res.status(404).json({ message: "Bài viết không tồn tại" });
        }
        //kiểm tra có phản ứng chưa
        let reaction = await Reaction.findOne({
            where: { userId, postId }
        });
        if (!reaction) {
            //Tạo phản ứng mới
            reaction = await Reaction.create({
                type,
                userId,
                postId
            });

            //tạo thông báo có react cho người sở hữu bài viết
            await createNotification(post.userId, 'like', `${userId} đã thêm phản ứng ${type} vào bài viết của bạn`, userId, postId);

            return res.status(201).json({
                message: "Đã thêm phản ứng",
                reactionId: reaction.id
            });
        } else {
            //Cập nhật phản ứng
            reaction.type = type;
            await reaction.save();
            //tạo thông báo có react cho người sở hữu bài viết
            await createNotification(post.userId, 'like', `${userId} đã thêm phản ứng ${type} vào bài viết của bạn`, userId, postId);
            return res.status(200).json({
                message: "Đã cập nhật phản ứng",
                reactionId: reaction.id
            })
        }
    } catch (error) {
        console.error("Lỗi khi thêm phản ứng", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
// Đếm reaction của post: trả về tổng số, từng loại, trạng thái của user hiện tại
const { Op, fn, col } = require('sequelize');
const countReactionsByPost = async (req, res) => {
    const postId = req.params.postId;
    const userId = req.userId;
    try {
        // Đếm từng loại
        const reactions = await Reaction.findAll({
            where: { postId },
            attributes: ['type', [fn('COUNT', col('type')), 'count']],
            group: ['type']
        });
        // Tổng số
        const total = await Reaction.count({ where: { postId } });
        // Reaction của user hiện tại
        const myReaction = await Reaction.findOne({ where: { postId, userId } });
        return res.status(200).json({
            reactions,
            total,
            myReaction: myReaction ? myReaction.type : null
        });
    } catch (error) {
        console.error("Lỗi khi đếm phản ứng", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

const reactComment = async (req, res) => {
    const userId = req.userId;
    const commentId = req.params.commentId;
    const { type } = req.body;
    try {
        //Kiểm tra comment tồn tại hay không
        const comment = await Comment.findByPk(commentId, {
            attributes: ['id', 'userId']
        });
        if (!comment) {
            return res.status(404).json({ message: "Bình luận không tồn tại" });
        }
        //Kiểm tra đã phản ứng chưa
        let reaction = await Reaction.findOne({
            where: { userId, commentId }
        });
        if (!reaction) {
            //Tạo phản ứng mới
            reaction = await Reaction.create({
                type,
                userId,
                commentId
            });
            //tạo thông báo có react cho người sở hữu comment (nếu không phải chính mình)
            if (comment.userId !== userId) {
                try {
                    await createNotification(comment.userId, 'react', `${userId} đã thêm phản ứng ${type} vào bình luận của bạn`, userId, commentId);
                } catch (notifError) {
                    console.error("Lỗi khi tạo notification:", notifError);
                    // Không throw, tiếp tục xử lý
                }
            }
            return res.status(201).json({
                message: "Đã thêm phản ứng",
                reactionId: reaction.id
            });
        } else {
            //Cập nhật phản ứng
            reaction.type = type;
            await reaction.save();
            //tạo thông báo có react cho người sở hữu comment (nếu không phải chính mình)
            if (comment.userId !== userId) {
                try {
                    await createNotification(comment.userId, 'react', `${userId} đã thêm phản ứng ${type} vào bình luận của bạn`, userId, commentId);
                } catch (notifError) {
                    console.error("Lỗi khi tạo notification:", notifError);
                    // Không throw, tiếp tục xử lý
                }
            }
            return res.status(200).json({
                message: "Đã cập nhật phản ứng",
                reactionId: reaction.id
            })
        }
    } catch (error) {
        console.error("Lỗi khi thêm phản ứng", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//Đếm react comment
const countReactionsByComment = async (req, res) => {
    const commentId = req.params.commentId;
    try {
        const reactions = await Reaction.findAll({
            where: { commentId },
            attributes: ['type', [fn('COUNT', col('type')), 'count']],
            group: ['type']
        });
        return res.status(200).json({ reactions });
    } catch (error) {
        console.error("Lỗi khi đếm phản ứng", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//api xóa react
const deleteReact = async (req, res) => {
    const userId = req.userId;
    const { postId } = req.params;
    try {
        if (!postId) {
            return res.status(400).json({ message: "Không có post" })
        }
        //tìm reaction của user trên post
        const reaction = await Reaction.findOne({
            where: { userId, postId }
        })
        if (!reaction) {
            return res.status(404).json({ message: "Không có reaction nào" })
        }
        //xóa reaction
        await reaction.destroy();
        return res.status(200).json({ message: "Đã hủy bỏ reaction" })
    } catch (error) {
        console.error("Lỗi khi xóa reaction post:", error)
        return res.status(500).json({ message: "Lỗi hệ thống" })
    }

}

//xóa react comment
const deleteReactComment = async (req, res) => {
    const userId = req.userId;
    const commentId = req.params.commentId;
    try {
        const reaction = await Reaction.findOne({ where: { userId, commentId } });
        if (!reaction) {
            return res.status(404).json({ message: "Không có reaction nào" })
        }
        //xóa reaction
        await reaction.destroy();
        return res.status(200).json({ message: "Đã hủy bỏ reaction" })
    } catch (error) {
        console.error("Lỗi khi xóa reaction comment:", error)
        return res.status(500).json({ message: "Lỗi hệ thống" })
    }
}

module.exports = {
    reactPost,
    reactComment,
    countReactionsByPost,
    countReactionsByComment,
    deleteReact,
    deleteReactComment
};
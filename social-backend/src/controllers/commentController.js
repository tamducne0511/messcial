const Comment = require('../models/Comment');
const User = require('../models/User');
const Post = require('../models/Post');
const { createNotification } = require('../utils/notificationHelper');
const { io } = require('../../socket');

// Tạo bình luận mới
const createComment = async (req, res) => {

    try {
        const userId = req.userId;
        console.log("userId:", userId);
        const { postId, content, parentId } = req.body;
        if (!content || !postId) {
            return res.status(400).json({ message: "Thiếu nội dung hoặc ID bài viết" });
        }

        let parentComment = null;
        if (parentId) {
            // Kiểm tra bình luận cha có tồn tại không
            parentComment = await Comment.findByPk(parentId);
            if (!parentComment) {
                return res.status(404).json({ message: "Bình luận cha không tồn tại" });
            }
        }
        const newComment = await Comment.create({
            userId,
            postId,
            content,
            parentId: parentId || null
        });
        const commentWithUser = await Comment.findByPk(newComment.id, {
            include: [{
                model: User,
                attributes: ['id', 'displayName', 'avatar']
            }]
        });

        // Emit event
        io.to(`comments_${postId}`).emit('new_comment', {
            comment: {
                id: commentWithUser.id,
                content: commentWithUser.content,
                createdAt: commentWithUser.createdAt,
                parentId: commentWithUser.parentId,
                user: commentWithUser.User ? {
                    id: commentWithUser.User.id,
                    displayName: commentWithUser.User.displayName,
                    avatar: commentWithUser.User.avatar
                } : null,
            },
            postId: postId
        });
        //lấy thông tin người tạo comment
        const commenter = await User.findByPk(
            userId, {
            attributes: ['id', 'displayName', 'username']
        });

        // Xử lý thông báo
        if (parentId && parentComment) {
            // Nếu là reply: gửi thông báo cho người tạo comment cha (nếu không phải chính mình)
            if (parentComment.userId !== userId) {
                await createNotification(
                    parentComment.userId,
                    'comment',
                    `${commenter?.displayName || commenter?.username} đã trả lời bình luận của bạn`,
                    userId,
                    postId
                );
            }
        } else {
            // Nếu là comment mới: gửi thông báo cho chủ bài viết (nếu không phải chính mình)
            const post = await Post.findByPk(postId, {
                attributes: ['id', 'userId']
            });
            if (post && post.userId !== userId) {
                await createNotification(
                    post.userId,
                    'comment',
                    `${commenter?.displayName || commenter?.username} đã bình luận bài viết của bạn`,
                    userId,
                    postId
                );
            }
        }
        return res.status(201).json({
            message: "Bình luận đã được tạo",
            commentId: newComment.id,

        });



    } catch (error) {
        console.error("Lỗi khi tạo bình luận", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

// Sửa comment 
const updateComment = async (req, res) => {
    // TODO
    const userId = req.userId;
    const commentId = req.params.commentId;
    const { content } = req.body;
    try {
        //Kiểm tra comment tồn tại hay không  
        const comment = await Comment.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Bình luận không tồn tại" });
        }
        //Kiểm tra quyền sửa bình luận
        if (comment.userId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền sửa bình luận này" });
        }
        //Cập nhật nội dung bình luận
        comment.content = content;
        //emit đến sự kiện join_comment thôi
        //lấy thông tin người gửi comment
        const commenter = await User.findByPk(comment.userId, {
            attributes: ['id', 'displayName', 'avatar']
        });

        io.to(`comments_${comment.postId}`).emit('comment_updated', {
            comment: {
                id: comment.id,
                content: comment.content,
                createdAt: comment.createdAt,
                parentId: comment.parentId,
                user: commenter ? {
                    id: commenter.id,
                    displayName: commenter.displayName,
                    avatar: commenter.avatar
                } : null,
            }, 
            postId: comment.postId
        });
        //cập nhật bình luận
        await comment.save();
        return res.status(200).json({ message: "Bình luận đã được cập nhật" });
    } catch (error) {
        console.error("Lỗi khi cập nhật bình luận", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}


//Xóa comment kể cả bình luận con
const deleteComment = async (req, res) => {
    // TODO
    const userId = req.userId;
    const commentId = req.params.commentId;
    try {
        //Kiểm tra comment tồn tại hay không  
        const comment = await Comment.findByPk(commentId);
        if (!comment) {
            return res.status(404).json({ message: "Bình luận không tồn tại" });
        }
        //Kiểm tra quyền xóa bình luận
        if (comment.userId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
        }
        ///xóa tất cả replies
        await Comment.destroy({ where: { parentId: comment.id } });
        //Xóa bình luận
        await comment.destroy();
        //emit đến sự kiện join_comment thôi
        io.to(`comments_${comment.postId}`).emit('comment_deleted', {
            commentId: comment.id,
            postId: comment.postId
        });
        return res.status(200).json({ message: "Bình luận đã được xóa" });
    } catch (error) {
        console.error("Lỗi khi xóa bình luận", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//Đếm comment của 1 post
const countCommentsByPost = async (req, res) => {
    // TODO
    const postId = req.params.postId;
    try {
        const count = await Comment.count({ where: { postId } });
        return res.status(200).json({ count });
    } catch (error) {
        console.error("Lỗi khi đếm bình luận", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

// Lấy danh sách bình luận của bài post, kèm thông tin người comment và replies
const getCommentsByPost = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const postId = req.params.postId;
    try {
        const { rows: comments, count: totalComments } = await Comment.findAndCountAll({
            where: { postId, parentId: null },
            include: [
                {
                    model: require('../models').User,
                    attributes: ['id', 'displayName', 'avatar']
                },
                {
                    model: Comment,
                    as: 'replies',
                    include: [
                        {
                            model: require('../models').User,
                            attributes: ['id', 'displayName', 'avatar']
                        }
                    ]
                }
            ],
            order: [
                ['createdAt', 'ASC'],
                ['replies', 'createdAt', 'ASC']
            ],
            limit,
            offset
        });

        // Định dạng lại dữ liệu trả về
        const data = comments.map(c => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            user: c.User ? {
                id: c.User.id,
                displayName: c.User.displayName,
                avatar: c.User.avatar
            } : null,
            replies: c.replies ? c.replies.map(reply => ({
                id: reply.id,
                content: reply.content,
                createdAt: reply.createdAt,
                parentId: reply.parentId,
                user: reply.User ? {
                    id: reply.User.id,
                    displayName: reply.User.displayName,
                    avatar: reply.User.avatar
                } : null
            })) : []
        }));
        return res.status(200).json({ comments: data, totalComments: totalComments, totalPages: Math.ceil(totalComments / limit) });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bình luận", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
const getPostByComment = async (req, res) => {
    const commentId = req.params.commentId;
    try {
        const comment = await Comment.findByPk(commentId, {
            include: [{ model: Post, attributes: ['id', 'userId'] }]
        });

        if (!comment) {
            return res.status(404).json({ message: "Bình luận không tồn tại" });
        }

        return res.status(200).json({
            postId: comment.postId,
            commentId
        });
    } catch (error) {
        console.error("Lỗi khi lấy bài viết bởi comment", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

module.exports = {
    createComment,
    updateComment,
    deleteComment,
    countCommentsByPost,
    getCommentsByPost,
    getPostByComment
};

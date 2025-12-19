const { Post, PostMedia, User, Comment, Reaction, Friend } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('../utils/notificationHelper');

const FRIEND_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};

//Tạo bài viết mới
const createPost = async (req, res) => {
    try {
        const { content, media, privacy } = req.body;
        console.log("Received createPost request:", req.body);
        const userId = req.userId;
        console.log("Authenticated userId:", userId);
        const newPost = await Post.create({
            content,
            privacy,
            userId
        });

        if (media && Array.isArray(media)) {
            const postMediaData = media.map(item => ({
                postId: newPost.id,
                url: item.url,
                type: item.type
            }));
            await PostMedia.bulkCreate(postMediaData);
        }
        //lấy list bạn bè
        const friends = await Friend.findAll({
            where: {
                status: FRIEND_STATUS.ACCEPTED,
                [Op.or]: [
                    { userId: userId },
                    { friendId: userId }
                ],
            }
        });
        //lấy thông tin user đã đăng bài viết
        const user = await User.findByPk(userId, {
            attributes: ["id", "displayName", "avatar"]
        });
        const friendIds = friends.map(f => (f.userId === userId ? f.friendId : f.userId));
        console.log("friendIds", friendIds);
        if (friendIds && friendIds.length > 0) {
            // Tạo notification cho tất cả bạn bè song song và đợi tất cả hoàn thành
            await Promise.all(
                friendIds.map(async (friendId) => {
                    try {
                        await createNotification(friendId, 'post', `${user.displayName} đã đăng bài viết mới`, userId, newPost.id);
                    } catch (error) {
                        console.error(`Lỗi khi tạo notification cho friend ${friendId}:`, error);
                    }
                })
            );
        }

        return res.status(201).json({
            message: "Tạo bài viết thành công",
            postId: newPost.id
        });

    } catch (error) {
        console.error("Lỗi khi tạo bài viết", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//cập nhật bài post 
const updatePost = async (req, res) => {
    const userId = req.userId;
    const postId = req.params.postId;
    const { content, media, privacy } = req.body;
    try {
        //Kiểu tra user tồn tại hay không
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }
        //Kiểm tra post tồn tại hay không
        if (!postId) {
            return res.status(404).json({ message: "Bài post không tồn tại" });
        }
        // nếu không có gif để update
        const hasContent = typeof content !== 'undefined' && content !== null;
        const hasPrivacy = typeof privacy !== 'undefined' && privacy !== null;
        const hasMedia = Array.isArray(media);
        if (!hasContent && !hasPrivacy && !hasMedia) {
            return res.status(400).json({ message: "Khong co gi de cap nhat" });
        }
        // Lấy post
        const post = await Post.findByPk(postId);
        if (!post) {
            return res.status(404).json({ message: "Bài post không tồn tại" });
        }
        //Kiểm tra quyền sở hữu bài viết
        if (post.userId !== userId) {
            return res.status(403).json({ message: "Ban khong co quyen cap nhat bai viet nay" });
        }
        //Cập nhật nội dung bài viết nếu có
        if (hasContent) post.content = content;
        if (hasPrivacy) post.privacy = privacy;
        await post.save();
        //Cập nhật media nếu có
        if (hasMedia) {
            //Xóa media cũ
            await PostMedia.destroy({ where: { postId: post.id } });
            //Thêm media mới
            const postMediaData = media.map(item => ({
                postId: post.id,
                url: item.url,
                type: item.type
            }));
            await PostMedia.bulkCreate(postMediaData);
        }
        return res.status(200).json({ message: "Cập nhật bài post thành công" });

    } catch (error) {
        console.error("Loi khi cap nhat bai post", error);
        return res.status(500).json({ message: "Loi he thong" });
    }

}
//xóa bài post
const deletePost = async (req, res) => {
    const userId = req.userId;
    const postId = req.params.postId;

    //Kiểm tra post có tồn tại hay không
    const post = await Post.findOne({ where: { id: postId, userId: userId } });
    if (!post) {
        return res.status(404).json({ message: "Bài post không tồn tại" });
    }
    //Xóa bài post
    await Post.destroy({ where: { id: postId } });
    return res.status(200).json({ message: "Xóa bài post thành công" });
}

//Chi tiết bài post
const getPostDetails = async (req, res) => {
    const userId = req.userId;
    const postId = req.params.postId;

    // Kiểm tra bài post tồn tại
    const post = await Post.findOne({ where: { id: postId } }); // không cần userId ở đây nếu muốn xem post của tất cả
    if (!post) {
        return res.status(404).json({ message: "Bài post không tồn tại" });
    }

    // Chi tiết bài post
    const postDetail = await Post.findByPk(postId, {
        include: [
            { model: User, attributes: ["id", "displayName", "avatar"] },
            { model: PostMedia, attributes: ["id", "type", "url"] },
            {
                model: Comment,
                attributes: ["id", "content", "parentId", "userId", "createdAt"],
                include: [{ model: User, attributes: ["id", "displayName", "avatar"] }],
            },
            { model: Reaction, attributes: ["id", "type", "userId"] },
        ],
    });

    if (!postDetail) {
        return res.status(404).json({ message: "Chi tiết bài post không tồn tại" });
    }

    // Xử lý reactions
    const reactionSummary = {};
    let myReaction = null;
    postDetail.Reactions.forEach(r => {
        reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
        if (r.userId === userId) myReaction = r.type;
    });

    // Xử lý comments
    const comments = postDetail.Comments.map(c => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        parentId: c.parentId,
        user: c.User ? {
            id: c.User.id,
            displayName: c.User.displayName,
            avatar: c.User.avatar
        } : null
    }));

    // Xử lý media
    const media = postDetail.PostMedia.map(m => ({
        id: m.id,
        type: m.type,
        url: m.url
    }));

    // Gộp data
    const postData = {
        id: postDetail.id,
        content: postDetail.content,
        createdAt: postDetail.createdAt,
        user: postDetail.User ? {
            id: postDetail.User.id,
            displayName: postDetail.User.displayName,
            avatar: postDetail.User.avatar
        } : null,
        media,
        reactionSummary,
        reactionsTotal: postDetail.Reactions.length,
        myReaction,
        comments,
        commentsCount: comments.length,
        shares: postDetail.shares || 0
    };

    return res.status(200).json({ post: postData });
};

// Danh sách các bài post: lấy bài của user và bạn bè, trả về đầy đủ thông tin
const getPosts = async (req, res) => {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    //offset bỏ qua bản ghi nào
    const offset = (page - 1) * limit;
    try {
        // Kiểm tra user tồn tại
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }
        // Lấy danh sách bạn bè (cả 2 chiều)
        const friends = await Friend.findAll({
            where: {
                status: FRIEND_STATUS.ACCEPTED,
                [Op.or]: [
                    { userId },
                    { friendId: userId }
                ]
            }
        });
        // Lấy id bạn bè
        const friendIds = friends.map(f => (f.userId === userId ? f.friendId : f.userId));
        const userIds = [userId, ...friendIds];

        // Lấy bài post
        const { rows: posts, count: totalPosts } = await Post.findAndCountAll({
            where: { userId: { [Op.in]: userIds } },
            distinct: true,
            include: [
                { model: User, attributes: ['id', 'displayName', 'avatar'] },
                { model: PostMedia, attributes: ['id', 'type', 'url'] },
                {
                    model: Comment,
                    attributes: ['id', 'content', 'parentId', 'userId', 'createdAt'],
                    include: [{ model: User, attributes: ['id', 'displayName', 'avatar'] },
                    { model: Reaction, attributes: ['id', 'type', 'userId'] }
                    ],
                    // nếu muốn chỉ lấy 3 comment mới nhất
                    // limit: 3,
                    // separate: true // xem note bên dưới
                },
                { model: Reaction, attributes: ['id', 'type', 'userId'] },
                {
                    model: Post, attributes: ['id', 'content', 'privacy', 'createdAt'], as: 'SharedPost',
                    include: [
                        { model: User, attributes: ['id', 'displayName', 'avatar'] },
                        { model: PostMedia, attributes: ['id', 'type', 'url'] },
                        { model: Comment, attributes: ['id', 'content', 'parentId', 'userId', 'createdAt'],
                            include: [{ model: User, attributes: ['id', 'displayName', 'avatar'] },
                        ]},
                        { model: Reaction, attributes: ['id', 'type', 'userId'] }
                    ]
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        // Xử lý dữ liệu trả về: tổng hợp reaction, lấy reaction của user hiện tại
        const postsData = await Promise.all(posts.map(async post => {
            // Tổng hợp reaction theo loại
            const reactionSummary = {};
            let myReaction = null;
            post.Reactions.forEach(r => {
                reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
                if (r.userId === userId) myReaction = r.type;
            });
            // Định dạng lại comment
            const comments = post.Comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                parentId: c.parentId,
                reactions: c.Reactions.map(r => ({
                    id: r.id,
                    type: r.type,
                    userId: r.userId
                })),
                reactionsCount: c.Reactions.length,
                myReaction: c.Reactions.find(r => r.userId === userId)?.type || null,
                user: c.User ? {
                    id: c.User.id,
                    displayName: c.User.displayName,
                    avatar: c.User.avatar
                } : null
            }));
            // Định dạng media
            const media = post.PostMedia.map(m => ({
                id: m.id,
                type: m.type,
                url: m.url
            }));
            // Trả về dữ liệu chuẩn cho FE
            return {
                id: post.id,
                content: post.content,
                createdAt: post.createdAt,
                user: post.User ? {
                    id: post.User.id,
                    displayName: post.User.displayName,
                    avatar: post.User.avatar
                } : null,
                media,
                reactionSummary,
                reactionsTotal: post.Reactions.length,
                myReaction,
                comments,
                commentsCount: comments.length,
                shares: post.shares || 0, // nếu có trường shares
                sharedPost: post.SharedPost ? {
                    id: post.SharedPost.id,
                    content: post.SharedPost.content,
                    createdAt: post.SharedPost.createdAt,
                    user: post.SharedPost.User,
                    media: post.SharedPost.PostMedia,
                    reactionsTotal: post.SharedPost.Reactions?.length || 0,
                  } : null
            };
        }));

        return res.status(200).json({
            currentPage: page,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            posts: postsData
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bài post", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

const getUserPosts = async (req, res) => {
    const targetUserId = parseInt(req.params.userId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    try {
        const user = await User.findByPk(targetUserId, {
            attributes: ["id", "displayName", "avatar", "bio", "username", "phone", "email", "createdAt"]
        });
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        const { rows: posts, count: totalPosts } = await Post.findAndCountAll({
            where: { userId: targetUserId },
            distinct: true,
            include: [
                { model: User, attributes: ["id", "displayName", "username", "avatar", "phone", "email", "bio", "createdAt"] },
                { model: PostMedia, attributes: ["id", "type", "url"] },
                {
                    model: Comment,
                    attributes: ["id", "content", "parentId", "userId", "createdAt"],
                    include: [{ model: User, attributes: ["id", "displayName", "avatar"] }],
                },
                { model: Reaction, attributes: ["id", "type", "userId"] },
                { model: Post, attributes: ['id', 'content', 'privacy', 'sharedPostId', 'createdAt'], as: 'SharedPost',
                    include: [
                        { model: User, attributes: ['id', 'displayName', 'avatar'] },
                        { model: PostMedia, attributes: ['id', 'type', 'url'] },
                        { model: Comment, attributes: ['id', 'content', 'parentId', 'userId', 'createdAt'],
                            include: [{ model: User, attributes: ['id', 'displayName', 'avatar'] },
                        ]},
                        { model: Reaction, attributes: ['id', 'type', 'userId'] }
                    ]
                }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset,
        });

        const postsData = posts.map(post => {
            const reactionSummary = {};
            let myReaction = null;
            post.Reactions.forEach(r => {
                reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
                if (r.userId === req.userId) myReaction = r.type;
            });

            const comments = post.Comments.map(c => ({
                id: c.id,
                content: c.content,
                createdAt: c.createdAt,
                parentId: c.parentId,
                user: c.User ? {
                    id: c.User.id,
                    displayName: c.User.displayName,
                    avatar: c.User.avatar,
                } : null,
            }));

            const media = post.PostMedia.map(m => ({
                id: m.id,
                type: m.type,
                url: m.url,
            }));

            return {
                id: post.id,
                content: post.content,
                createdAt: post.createdAt,
                user: post.User ? {
                    id: post.User.id,
                    displayName: post.User.displayName,
                    username: post.User.username,
                    avatar: post.User.avatar,
                    phone: post.User.phone,
                    email: post.User.email,
                    bio: post.User.bio,
                    createdAt: post.User.createdAt,
                } : null,
                media,
                reactionSummary,
                reactionsTotal: post.Reactions.length,
                myReaction,
                comments,
                commentsCount: comments.length,
                shares: post.shares || 0,
                sharedPost: post.SharedPost ? {
                    id: post.SharedPost.id,
                    content: post.SharedPost.content,
                    createdAt: post.SharedPost.createdAt,
                    user: post.SharedPost.User,
                    media: post.SharedPost.PostMedia,
                    reactionsTotal: post.SharedPost.Reactions?.length || 0,
                } : null
            };
        });


        //kiểm tra trạng thái gửi lời mời
        const invite = await Friend.findOne({
            where: {
                status: FRIEND_STATUS.PENDING,
                [Op.or]: [
                    { userId: req.userId, friendId: targetUserId },
                    { userId: targetUserId, friendId: req.userId }
                ]
            }
        });
        let iviteStatus;
        if (invite) {
            iviteStatus = "Đã gửi lời mời";
        } else {
            iviteStatus = "Chưa gửi lời mời";
        }


        // kiểm tra trạng thái bạn bè
        const friend = await Friend.findOne({
            where: {
                status: FRIEND_STATUS.ACCEPTED,
                [Op.or]: [
                    { userId: req.userId, friendId: targetUserId },
                    { userId: targetUserId, friendId: req.userId }
                ]
            }
        });
        let friendStatus;
        if (req.userId === targetUserId) {
            friendStatus = "Chính bạn";
        } else if (friend) {
            friendStatus = "Bạn bè";
        } else {
            friendStatus = "Chưa kết bạn";
        }

        return res.status(200).json({
            currentPage: page,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            posts: postsData,
            profile: {
                id: user.id,
                displayName: user.displayName,
                username: user.username,
                avatar: user.avatar,
                bio: user.bio,
                phone: user.phone,
                email: user.email,
                createdAt: user.createdAt,
                friendStatus,
                iviteStatus
            }
        });
    } catch (error) {
        console.error("Lỗi khi lấy bài viết user", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//Lấy danh sách tất cả bài post
const getAllPost = async (req, res) => {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    // Chỉ tạo whereClause khi có search term
    const whereClause = {};
    if (search.trim()) {
        console.log("search:", search);
        whereClause[Op.or] = [
            { content: { [Op.like]: `%${search}%` } }
        ];
    }
    try {
        const { rows: posts, count: totalPosts } = await Post.findAndCountAll({
            where: whereClause,
            distinct: true,
            include: [
                { model: User, attributes: ["id", "displayName", "avatar"] },

                { model: PostMedia, attributes: ["id", "type", "url"] },

                {
                    model: Comment,
                    attributes: ["id", "content", "parentId", "userId", "createdAt"],
                    include: [
                        { model: User, attributes: ["id", "displayName", "avatar"] },
                        { model: Reaction, attributes: ["id", "type", "userId"] }
                    ],
                    limit,
                    order: [["createdAt", "DESC"]],
                    separate: true
                },

                { model: Reaction, attributes: ["id", "type", "userId"] }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });

        const postsData = posts.map(post => {
            const reactionSummary = {};
            let myReaction = null;

            post.Reactions.forEach(r => {
                reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
                if (r.userId === userId) myReaction = r.type;
            });

            return {
                id: post.id,
                content: post.content,
                createdAt: post.createdAt,

                user: post.User ? {
                    id: post.User.id,
                    displayName: post.User.displayName,
                    avatar: post.User.avatar
                } : null,

                media: post.PostMedia.map(m => ({
                    id: m.id,
                    type: m.type,
                    url: m.url
                })),

                comments: post.Comments.map(c => ({
                    id: c.id,
                    content: c.content,
                    createdAt: c.createdAt,
                    parentId: c.parentId,
                    reactions: c.Reactions.map(r => ({
                        id: r.id,
                        type: r.type,
                        userId: r.userId
                    })),
                    reactionsCount: c.Reactions.length,
                    myReaction: c.Reactions.find(r => r.userId === userId)?.type || null,
                    user: c.User ? {
                        id: c.User.id,
                        displayName: c.User.displayName,
                        avatar: c.User.avatar
                    } : null
                })),

                commentsCount: post.Comments.length,
                reactionSummary,
                reactionsTotal: post.Reactions.length,
                myReaction
            };

        });

        res.status(200).json({
            currentPage: page,
            totalPosts,
            totalPages: Math.ceil(totalPosts / limit),
            posts: postsData
        });

    } catch (error) {
        console.error("Lỗi lấy post:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//lấy tất cả ảnh và video theo userId
const getAllImages = async (req, res) => {
    const userId = req.params.userId;
    console.log(userId);
    try {
        //lấy tất cả video và ảnh trong các bài post của user
        const posts = await Post.findAll({
            where: { userId: userId },
            include: [
                { model: PostMedia, attributes: ["id", "type", "url"] }
            ]
        });
        console.log("posts", posts);
        //lấy theo type là image hoặc video
        const allMedia = posts.flatMap(
            p => Array.isArray(p.PostMedia) ? p.PostMedia.map(m => ({
                url: m.url,
                type: m.type
            })) : []
        )
        const images = allMedia.filter(m => m.type === 'image');
        const videos = allMedia.filter(m => m.type === 'video');
        return res.status(200).json({ images, videos });
    } catch (error) {
        console.error("Lỗi lấy tất cả ảnh:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//chia sẻ bài posst
const sharePost = async (req, res) => {
    const userId = req.userId;
    const { sharedPostId, privacy, content } = req.body;
    try {
        const post = await Post.findByPk(sharedPostId);
        if (!post) {
            return res.status(404).json({ message: "Bài post không tồn tại" });
        }
        //Tạo bài post mới
        const newPost = await Post.create({
            content: content,
            privacy: privacy,
            sharedPostId: sharedPostId,
            userId: userId
        });
        return res.status(200).json({ message: "Bài post đã được chia sẻ", postId: newPost.id });
    } catch (error) {
        console.error("Lỗi chia sẻ bài post:", error);
        res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

module.exports = {
    createPost,
    getPosts,
    updatePost,
    deletePost,
    getPostDetails,
    getUserPosts,
    getAllPost,
    getAllImages,
    sharePost
};
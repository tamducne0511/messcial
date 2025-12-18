const { ConversationMembers, User, Conversation, Message } = require('../models/index');
const { Op } = require('sequelize');
// Thêm 
const addMember = async (req, res) => {
    const { memberIds, conversationId, name } = req.body;
    const userId = req.userId;

    try {
        // 1. Lấy conversation cũ
        const oldConversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: ConversationMembers,
                as: 'members',
                attributes: ['userId']
            }]
        });

        if (!oldConversation) {
            return res.status(404).json({ message: "Conversation không tồn tại" });
        }

        // 2. Nếu đang là direct tạo mới
        if (oldConversation.type === 'direct') {

            // Lấy danh sách các user cũ
            const oldMemberIds = oldConversation.members.map(m => m.userId);

            // tạo mới cũ và mới người dùng set để không trùng nhau
            const uniqueIds = Array.from(new Set([...oldMemberIds, ...memberIds]));

            // Tạo conversation group mới
            const newConversation = await Conversation.create({
                type: 'group',
                name: name || "Nhóm mới"
            });

            // Thêm toàn bộ user vào conversation_members
            await ConversationMembers.bulkCreate(
                uniqueIds.map(uid => ({
                    conversationId: newConversation.id,
                    userId: uid,
                    role: uid === userId ? "admin" : "member"
                }))
            );

            //Lấy conversation group đầy đủ trả về FE
            const fullNewConversation = await Conversation.findByPk(newConversation.id, {
                include: [{
                    model: ConversationMembers,
                    as: 'members',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'displayName', 'avatar']
                    }]
                }]
            });

            return res.status(200).json({
                message: "Đã tạo nhóm chat mới từ direct chat",
                conversation: fullNewConversation
            });
        }

        // Nếu conversation đã là group, thêm member mới
        const existingMemberIds = oldConversation.members.map(m => m.userId);
        const newMemberIds = memberIds.filter(id => !existingMemberIds.includes(id));

        if (newMemberIds.length === 0) {
            return res.status(400).json({ message: "Thành viên đã tồn tại trong nhóm" });
        }

        await ConversationMembers.bulkCreate(
            newMemberIds.map(memberId => ({
                conversationId: conversationId,
                userId: memberId,
                role: 'member'
            }))
        );

        const updatedConversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: ConversationMembers,
                as: 'members',
                include: [{ model: User, as: 'user' }]
            }]
        });

        return res.status(200).json({
            message: "Đã thêm thành viên vào nhóm",
            conversation: updatedConversation
        });

    } catch (error) {
        console.error("Lỗi khi thêm thành viên đoạn chat", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//XÓA
const removeMember = async (req, res) => {
    const userId = req.userId;
    const { conversationId, memberId } = req.params;
    try{
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation không tồn tại" });
        }
        //Kiểm tra user có phải admin hay không
        const isAdmin = await ConversationMembers.findOne({
            where: { conversationId, userId, role: 'admin' }
        });
        if (!isAdmin) {
            return res.status(403).json({ message: "Bạn không có quyền xóa thành viên" });
        }
        //Không cho admin tự xóa mình
        if(userId === memberId) {
            return res.status(403).json({ message: "Bạn không thể xóa chính mình" });
        }
        //Xóa thành viên
        await ConversationMembers.destroy({
            where: { conversationId, userId: memberId }
        });
        return res.status(200).json({ message: "Thành viên đã được xóa"});
    }
    catch (error) {
        console.error("Lỗi khi xóa thành viên đoạn chat", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//danh sách thành viên đoạn chat
const getMembers = async (req, res) => {
    const { conversationId } = req.params;
    const userId = req.userId;
    try {
        //kiểm tra user có phải thành viên của đoạn chat hay không
        const conversationMember = await ConversationMembers.findOne({
            where: { conversationId, userId }
        });
        if (!conversationMember) {
            return res.status(403).json({ message: "Bạn không có quyền xem danh sách thành viên đoạn chat" });
        }
        const conversation = await Conversation.findByPk(conversationId, {
            include: [{
                model: ConversationMembers,
                as: 'members',
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }]
            }]
        });
        if (!conversation) {
            return res.status(404).json({ message: "Conversation không tồn tại" });
        }
        const members = conversation.members;
        return res.status(200).json({ message: "Lấy danh sách thành viên đoạn chat thành công", members });
    }
    catch (error) {
        console.error("Lỗi khi lấy danh sách thành viên đoạn chat", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
// rời nhóm cho mỗi user
const leaveConversation = async (req, res) => {
    const userId = req.userId;
    const conversationId = req.params.conversationId;
    try {
        //kiểm tra đoạn hội thoại
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation không tồn tại" });
        }
        //kiểm tra user có phải thành viên của đoạn chat hay không
        const conversationMember = await ConversationMembers.findOne({
            where: { conversationId, userId }
        });
        if (!conversationMember) {
            return res.status(403).json({ message: "Bạn không có quyền rời nhóm" });
        }
        //rời nhóm
        await ConversationMembers.destroy({
            where: { conversationId, userId }
        });
        return res.status(200).json({ message: "Bạn đã rời nhóm" });
    } catch (error) {
        console.error("Lỗi khi rời nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
module.exports = {
    addMember,
    removeMember,
    getMembers,
    leaveConversation
}
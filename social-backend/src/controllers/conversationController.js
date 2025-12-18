const { Message, User, Conversation, ConversationMembers } = require('../models/index');
const { Op } = require('sequelize');
//Tạo đoạn chat
const createChat = async (req, res) => {
    const { type, name, memberIds } = req.body;
    try {
        if (!type || !memberIds) {
            return res.status(400).json({ message: "Thiếu thông tin" });
        }
        if (type !== 'direct' && type !== 'group') {
            return res.status(400).json({ message: "Loại chat không hợp lệ" });
        }
        if (memberIds.length < 2) {
            return res.status(400).json({ message: "Phải có ít nhất 2 thành viên" });
        }
        //tạo conversation
        const conversation = await Conversation.create({
            type,
            name: type === 'group' ? name : null,
        });
        //thêm thành viên vào conversation_members
        await ConversationMembers.bulkCreate(memberIds.map(userId => ({
            conversationId: conversation.id,
            userId: userId,
            role: 'member',
        })))
        //trả về đoạn chat
        const fullConversation = await Conversation.findByPk(conversation.id, {
            include: [
                {
                    model: ConversationMembers,
                    as: 'members',
                    include: [{
                        model: User,
                        as: 'user',
                    }]
                }
            ]
        })
        return res.status(200).json({ message: "Đoạn chat đã được tạo", conversation: fullConversation });
    } catch (error) {
        console.error("Lỗi khi tạo đoạn chat", error.message);
        return res.status(500).json({ message: error.message });
    }
}

//tạo cuộc trò chuyện nhóm khi thêm thành viên mới
const createGroupChat = async (req, res) => {
    const userId = req.userId;
    const { name, memberIds } = req.body;
    try {
        if (!name || !memberIds) {
            return res.status(400).json({ message: "Thiếu thông tin" });
        }
        if (memberIds.length < 2) {
            return res.status(400).json({ message: "Phải có ít nhất 2 thành viên" });
        }
        //tạo conversation
        const conversation = await Conversation.create({
            type: 'group',
            name: name,
        })

        // Lọc bỏ userId khỏi member id
        const otherMemberIds = memberIds.filter(id => id !== userId);

        // Thêm các thành viên khác vào conversation_members với role 'member'
        if (otherMemberIds.length > 0) {
            await ConversationMembers.bulkCreate(otherMemberIds.map(memberId => ({
                conversationId: conversation.id,
                userId: memberId,
                role: 'member',
            })));
        }

        // Thêm userId  vào conversation_members với role 'admin'
        await ConversationMembers.create({
            conversationId: conversation.id,
            userId: userId,
            role: 'admin',
        });

        //trả về đoạn chat
        const fullConversation = await Conversation.findByPk(conversation.id, {
            include: [
                {
                    model: ConversationMembers,
                    as: 'members',
                    include: [{
                        model: User,
                        as: 'user',
                    }]
                }
            ]
        })
        return res.status(200).json({ message: "Cuộc trò chuyện nhóm đã được tạo", conversation: fullConversation });
    } catch (error) {
        console.error("Lỗi khi tạo cuộc trò chuyện nhóm", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//lấy danh sách đoạn chat
const getConversations = async (req, res) => {
    const userId = req.userId;
    console.log(userId);
    try {
        //danh sách đoạn chat của user đó
        const userConversations = await ConversationMembers.findAll({
            where: {
                userId: userId,
                deletedAt: null
            }
        });
        console.log("userConversations", userConversations);
        const conversationIds = userConversations.map(c => c.conversationId);

        const conversations = await Conversation.findAll({
            where: {
                id: {
                    [Op.in]: conversationIds
                }
            },
            include: [
                {
                    model: ConversationMembers,
                    as: 'members',
                    include: [{
                        model: User,
                        as: 'user',
                    }]
                },
                {
                    model: Message,
                    as: 'messages',
                    limit: 1,
                    order: [['createdAt', 'DESC']],
                }
            ],
            order: [['updatedAt', 'DESC']],
        });
        console.log("conversations", conversations);
        const result = conversations.map(c => {
            const members = c.members.filter(m => m.userId !== userId);
            const otherPerson = members.find(m => m.userId !== userId);
            const lastMessage = c.messages[0]?.content || null;

            return {
                id: c.id,
                name: c.name,
                avatar: c.avatar,
                members: members,
                otherPerson: otherPerson,
                lastMessage: lastMessage,
                type: c.type,
            }
        })
        console.log("result", result);
        return res.status(200).json({ result });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách đoạn chat", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//tìm và tạo đoạn chat 1-1
const findOrCreateChat = async (req, res) => {
    const userId = req.userId;
    console.log("userId", userId);
    //id của người khác
    const otherId = Number(req.body.otherId);
    console.log("otherId", otherId);
    try {
        if (!otherId) {
            return res.status(400).json({ message: "Thiếu thông tin" });
        }
        if (userId === otherId) {
            return res.status(400).json({ message: "Bạn không thể tạo đoạn chat với chính mình" });
        }
        // Tìm đoạn chat direct có chứa CẢ 2 người (userId và otherId)
        // Lấy tất cả conversations direct mà userId là thành viên
        const userConversations = await Conversation.findAll({
            where: {
                type: 'direct',
            },
            include: [
                {
                    model: ConversationMembers,
                    as: 'members',
                    where: {
                        userId: userId
                    },
                    required: true,
                }
            ],
        });

        // Tìm conversation có đúng 2 thành viên và có cả userId và otherId
        let existingConversation = null;
        for (const conv of userConversations) {
            const members = await ConversationMembers.findAll({
                where: {
                    conversationId: conv.id
                }
            });

            const memberIds = members.map(m => m.userId);
            // Kiểm tra có đúng 2 thành viên và có cả userId và otherId
            if (memberIds.length === 2 &&
                memberIds.includes(userId) &&
                memberIds.includes(otherId)) {
                existingConversation = conv;
                break;
            }
        }

        console.log("existingConversation", existingConversation);
        if (existingConversation) {
            // Lấy conversation đầy đủ với thông tin members
            const fullConversation = await Conversation.findByPk(existingConversation.id, {
                include: [
                    {
                        model: ConversationMembers,
                        as: 'members',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'displayName', 'avatar'],
                        }]
                    }
                ]
            });
            return res.status(200).json({ conversation: fullConversation });
        } else {
            //tạo đoạn chat mới
            const newConversation = await Conversation.create({
                type: 'direct',
            });
            const newMembers = await ConversationMembers.bulkCreate([
                {
                    conversationId: newConversation.id,
                    userId: userId,
                    role: 'member',
                },
                {
                    conversationId: newConversation.id,
                    userId: otherId,
                    role: 'member',
                }
            ]);
            console.log("newMembers", newMembers);
            const fullConversation = await Conversation.findByPk(newConversation.id, {
                include: [
                    {
                        model: ConversationMembers,
                        as: 'members',
                        include: [{
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'displayName', 'avatar'],
                        }]
                    }
                ]
            });
            console.log("fullConversation", fullConversation);
            return res.status(200).json({ message: "Đoạn chat đã được tạo", conversation: fullConversation });
        }

    } catch (error) {
        console.error("Lỗi khi tìm và tạo đoạn chat 1-1", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//xóa đoạn chat
const deleteConversation = async (req, res) => {
    const userId = req.userId;
    const conversationId = req.params.conversationId;
    try {
        //kiểm tra đoạn chat có tồn tại hay không
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Đoạn chat không tồn tại" });
        }
        const conversationMember = await ConversationMembers.findOne({
            where: { conversationId, userId }
        });
        if (!conversationMember) {
            return res.status(403).json({ message: "Bạn không có quyền xóa đoạn chat này" });
        }
        await conversationMember.update({
            deletedAt: new Date(),
            deletedAtConversation: new Date()
        });
        return res.status(200).json({ message: "Đoạn chat đã được xóa" });
    }
    catch (error) {
        console.error("Lỗi khi xóa đoạn chat", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

module.exports = {
    createChat,
    getConversations,
    findOrCreateChat,
    createGroupChat,
    deleteConversation,
}
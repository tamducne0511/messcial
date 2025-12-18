const { Message, User, Conversation, ConversationMembers } = require('../models/index');
const { Op } = require('sequelize');
const { io, emitToConversationMembers } = require('../../socket/index');
//gửi tin nhắn
const sendMessage = async (req, res) => {
    const userId = req.userId;
    const { conversationId, content, type } = req.body;
    try {
        //Kiểm tra đoạn chat có tồn tại hay không
        const chat = await Conversation.findByPk(conversationId);
        if (!chat) {
            return res.status(404).json({ message: "Chat không tồn tại" });
        }
        //Kiểm tra đoạn chat có thuộc về userId hay không
        const conversationMembers = await ConversationMembers.findAll({
            where: {
                conversationId: conversationId,
                userId: userId
            }
        });
        if (!conversationMembers || conversationMembers.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền gửi tin nhắn trong đoạn chat này" });
        }
        //Tạo tin nhắn
        const message = await Message.create({
            senderId: userId,
            conversationId,
            content,
            messageType: type || 'text'
        });
        //lấy thông tin đầy đủ của message với sender
        const messageWithSender = await Message.findByPk(message.id, {
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'username', 'displayName', 'avatar']
            }]
        })
        //Cập nhật lại tin nhắn cuối cùng của chat
        await Conversation.update({
            lastMessageId: message.id
        }, {
            where: { id: conversationId }
        });
        //emit socket để gửi tin nhắn real time đến TẤT CẢ members (kể cả khi họ đang ở conversation khác)
        await emitToConversationMembers(conversationId, 'new_message',
            { message: messageWithSender });
        //emit event để cập nhật danh sách conversation real time
        await emitToConversationMembers(conversationId, 'conversation_updated',
            {
                conversationId,
                lastMessage: messageWithSender
            });
        //trả về tin nhắn
        return res.status(200).json({ message: "Tin nhắn đã được gửi", messageId: message.id });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//danh sách tin nhắn
const getMessages = async (req, res) => {
    const userId = req.userId;
    const { conversationId } = req.params;
    try {
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Đoạn chat không tồn tại" });
        }
        //Kiểm tra có quyền xem tin nhắn trong đoạn chat hay không
        const conversationMembers = await ConversationMembers.findAll({
            where: {
                conversationId: conversationId,
                userId: userId
            }
        });
        if (!conversationMembers || conversationMembers.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền xem tin nhắn trong đoạn chat này" });
        }
        const messages = await Message.findAll({
            where: {
                conversationId,
            },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }
            ]
        });
        return res.status(200).json({ messages });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//xóa tin nhắn
const deleteMessage = async (req, res) => {
    const userId = req.userId;
    const { messageId } = req.params;
    try {
        //Kiểm tra tin nhắn có tồn tại hay không
        const message = await Message.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ message: "Tin nhắn không tồn tại" });
        }
        //Kiểm tra quyền xóa tin nhắn
        if (message.senderId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền xóa tin nhắn này" });
        }
        //lưu conversationId
        const conversationId = message.conversationId;
        //Xóa tin nhắn
        await Message.destroy({ where: { id: messageId } })
        //emit event đến TẤT CẢ members
        await emitToConversationMembers(conversationId, 'message_deleted',
            {
                messageId,
                conversationId,
            });
        return res.status(200).json({ message: "Tin nhắn đã được xóa" });
    } catch (error) {
        console.error("Lỗi khi xóa tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//cập nhật tin nhắn
const updateMessage = async (req, res) => {
    const userId = req.userId;
    const { messageId } = req.params;
    const { content } = req.body;
    try {
        //Kiểm tra tin nhắn có tồn tại hay không
        const message = await Message.findByPk(messageId);
        if (!message) {
            return res.status(404).json({ message: "Tin nhắn không tồn tại" });
        }
        //Kiểm tra quyền cập nhật tin nhắn
        if (message.senderId !== userId) {
            return res.status(403).json({ message: "Bạn không có quyền cập nhật tin nhắn này" });
        }
        //Cập nhật tin nhắn
        await message.update({ content: content }, { where: { id: messageId } });
        //sau khi cập nhật thành công
        const updatedMessage = await Message.findByPk(messageId, {
            include: [{
                model: User,
                as: 'sender',
                attributes: ['id', 'username', 'displayName', 'avatar']
            }]
        });
        //emit event đến TẤT CẢ members
        await emitToConversationMembers(updatedMessage.conversationId, 'message_updated',
            { message: updatedMessage });
        return res.status(200).json({ message: "Tin nhắn đã được cập nhật" });
    }
    catch (error) {
        console.error("Lỗi khi cập nhật tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//tìm kiếm tin nhắn
const searchMessages = async (req, res) => {
    const userId = req.userId;
    const conversationId = req.params.conversationId;
    const { searchTerm } = req.body;
    try {
        //Kiểm tra đoạn chat có tồn tại hay không
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Đoạn chat không tồn tại" });
        }
        //Kiểm tra quyền xem tin nhắn trong đoạn chat
        const conversationMembers = await ConversationMembers.findAll({
            where: {
                conversationId: conversationId,
                userId: userId
            }
        });
        if (!conversationMembers || conversationMembers.length === 0) {
            return res.status(403).json({ message: "Bạn không có quyền xem tin nhắn trong đoạn chat này" });
        }
        //Tìm kiếm tin nhắn
        const messages = await Message.findAll({
            where: {
                conversationId,
                content: { [Op.like]: `%${searchTerm}%` }
            },
            order: [['createdAt', 'ASC']],
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }
            ]
        });
        return res.status(200).json({ messages });
    } catch (error) {
        console.error("Lỗi khi tìm kiếm tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//Đánh dấu tất cả tin nhắn trong conversation là đã đọc
const markMessagesAsRead = async (req, res) => {
    const userId = req.userId;
    const { conversationId } = req.params;
    try {
        // Kiểm tra conversation có tồn tại không
        const conversation = await Conversation.findByPk(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Cuộc trò chuyện không tồn tại" });
        }

        // Kiểm tra user có trong conversation không
        const member = await ConversationMembers.findOne({
            where: {
                conversationId: conversationId,
                userId: userId
            }
        });

        if (!member) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập cuộc trò chuyện này" });
        }

        // Lấy tin nhắn cuối cùng của conversation
        const lastMessage = await Message.findOne({
            where: {
                conversationId: conversationId
            },
            order: [['createdAt', 'DESC']]
        });

        if (lastMessage) {
            // Cập nhật lastReadMessageId = id của tin nhắn cuối cùng
            await member.update({
                lastReadMessageId: lastMessage.id
            });
        }

        // Emit socket event để cập nhật unread count real-time
        await emitToConversationMembers(conversationId, 'messages_marked_read', {
            conversationId: conversationId,
            userId: userId
        });

        return res.status(200).json({ 
            message: "Đã đánh dấu tất cả tin nhắn là đã đọc",
            lastReadMessageId: lastMessage?.id || null
        });
    } catch (error) {
        console.error("Lỗi khi đánh dấu tin nhắn đã đọc", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

module.exports = {
    sendMessage,
    getMessages,
    deleteMessage,
    updateMessage,
    searchMessages,
    markMessagesAsRead
}
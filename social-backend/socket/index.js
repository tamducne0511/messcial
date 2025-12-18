const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});
//lưu trữ user socket conect    
const userSockets = new Map();
io.on('connection', async (socket) => {
    console.log(`${socket.id} connected`);
    //user kêt nối với userId
    socket.on('user_connect', (userId) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`${socket.id} connected to user ${userId}`);
    })
    //user tham gia vào chat
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`${socket.id} joined conversation ${conversationId}`);
    })
    //user rời khỏi chat
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`${socket.id} left conversation ${conversationId}`);
    })
    //user tham gia room thoong báo
    socket.on('join_notifications', (userId) => {
        socket.join(`notifications_${userId}`);
        console.log(`${socket.id} joined notifications ${userId}`);
    })
    //user tham gia room comment
    socket.on('join_comments', (postId) => {
        socket.join(`comments_${postId}`);
        console.log(`${socket.id} joined comments ${postId}`);
    })
    //user rời khỏi room comment
    socket.on('leave_comments', (postId) => {
        socket.leave(`comments_${postId}`);
        console.log(`${socket.id} left comments ${postId}`);
    })
    //user rời khỏi room thoong báo
    socket.on('leave_notifications', (userId) => {
        socket.leave(`notifications_${userId}`);
        console.log(`${socket.id} left notifications ${userId}`);
    })
    //voice call gửi offer
    socket.on('voice_call_offer', async (data) => {
        const {toUserId, fromUserId, offer, callId} = data;
        //tìm socket người nhận
        const receiverSocketId = userSockets.get(toUserId);
        //gửi offer đến người nhận
        if(receiverSocketId) {
            io.to(receiverSocketId).emit('voice_call_offer', {
                fromUserId,
                offer,
                callId,
            });
        }else{
            io.to(socket.id).emit('voice_call_failed', {
                message: 'Người nhận không online',
            });
        }
    })
    //sự kiện voice call answer
    socket.on('voice_call_answer', async (data) => {
        const {toUserId, fromUserId, answer, callId} = data;
        //tìm socket người nhận
        const receiverSocketId = userSockets.get(toUserId);
        //gửi answer đến người nhận
        if(receiverSocketId) {
            io.to(receiverSocketId).emit('voice_call_answer', {
                fromUserId,
                answer,
                callId,
            });
        }else{
            io.to(socket.id).emit('voice_call_failed', {
                message: 'Người nhận không online',
            });
        }
    })
    //room call ice candidate- trao đổi cuộc gọi
    socket.on('voice_call_ice_candidate', async (data) => {
        const {toUserId, fromUserId, iceCandidate, callId} = data;
        //tìm socket người nhận
        const receiverSocketId = userSockets.get(toUserId);
        //gửi ice candidate đến người nhận
        if(receiverSocketId) {
            io.to(receiverSocketId).emit('voice_call_ice_candidate', {
                fromUserId,
                iceCandidate,
                callId,
            });
        }else{
            io.to(socket.id).emit('voice_call_failed', {
                message: 'Người nhận không online',
            });
        }
    })
    //room call end
    socket.on('voice_call_end', async (data) => {
        const {toUserId, fromUserId, callId} = data;
        //tìm socket người nhận
        const receiverSocketId = userSockets.get(toUserId);
        //gửi end call đến người nhận
        if(receiverSocketId) {
            io.to(receiverSocketId).emit('voice_call_end', {
                fromUserId,
                callId,
            });
        }
    })
    //room call reject
    socket.on('voice_call_reject', async (data) => {
        const {toUserId, fromUserId, callId} = data;
        //tìm socket người nhận
        const receiverSocketId = userSockets.get(toUserId);
        //gửi reject call đến người nhận
        if(receiverSocketId) {
            io.to(receiverSocketId).emit('voice_call_reject', {
                fromUserId,
                callId,
            });
        }
    })
    //user ngắt kết nối
    socket.on('disconnect', () => {
        const userId = socket.userId;
        if (userId) {
            userSockets.delete(userId);
            console.log(`${socket.id} disconnected`);
        }
    })
});

// Emit event đến tất cả members của conversation
const emitToConversationMembers = async (conversationId, eventName, data) => {
    const { ConversationMembers } = require('../src/models/index');
    
    try {
        // Lấy danh sách tất cả members của conversation
        const members = await ConversationMembers.findAll({
            where: {
                conversationId: conversationId
            }
        });
        
        // Emit đến từng member nếu họ đang online
        members.forEach(member => {
            const socketId = userSockets.get(member.userId);
            if (socketId) {
                io.to(socketId).emit(eventName, data);
            }
        });

    } catch (error) {
        console.error('Error emitting to conversation members:', error);
        // Fallback: emit đến room nếu có lỗi
        io.to(`conversation_${conversationId}`).emit(eventName, data);
    }
};

// Emit event đến user nhận thông báo
const emitToNotificationMembers = async (userId, eventName, data) => {
    try {
        // Emit trực tiếp đến room notifications của user đó
        // User đã join room này khi kết nối (dòng 33-35)
        io.to(`notifications_${userId}`).emit(eventName, data);
        console.log(`Emitted ${eventName} to notifications_${userId}`);
    } catch (error) {
        console.error('Error emitting to notification members:', error);
    }
};
module.exports = {
    io,
    server,
    app,
    userSockets,
    emitToConversationMembers,
    emitToNotificationMembers,
}
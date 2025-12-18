const express = require('express')
const dotenv = require("dotenv");
const path = require('path');
const sequelize = require('../social-backend/src/config/db')
const cookieParser = require('cookie-parser')
const cors = require('cors');
const authRoutes = require('./src/routes/authRoutes')
const userRoutes = require('./src/routes/userRoutes')
const postRoutes = require('./src/routes/postRoutes')
const friendRoutes = require('./src/routes/friendRoutes')
const commentRoutes = require('./src/routes/commentRoutes')
const reactionRoutes = require('./src/routes/reactionRoutes')
const uploadRoutes = require('./src/routes/uploadRoutes')
const notificationRoutes = require('./src/routes/notificationRoutes')
const messageRoutes = require('./src/routes/messageRoute')
const conversationRoutes = require('./src/routes/conversationRoute')
const conversationMemberRoutes = require('./src/routes/conversationMemberRoute')
const { middleware } = require('./src/middlewares/authMiddleware')
const { io, server, app } = require('./socket/index')
dotenv.config();
//midlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173", // FE của bạn
    credentials: true,               // Cho phép cookie/token
}));

// Serve static files - ĐẶT TRƯỚC authMiddleware để không cần token
app.use('/upload', express.static(path.join(__dirname, 'upload')))

//route
app.use('/api/auth', authRoutes);
app.use('/api/comments', commentRoutes); //xác thực cho các route bình luận
app.use('/api/media', uploadRoutes); // Upload media 
app.use(middleware); //xác thực cho các route dưới
app.use('/api/user', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/invite', friendRoutes);
app.use('/api/reactions', reactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/conversation_members', conversationMemberRoutes);
const PORT = process.env.PORT || 3000
sequelize.sync() // đồng bộ các model với DB
    .then(() => {
        server.listen(PORT, () => console.log("Server chạy trên port 5001"));
    })
    .catch(err => console.error("Lỗi kết nối DB:", err));


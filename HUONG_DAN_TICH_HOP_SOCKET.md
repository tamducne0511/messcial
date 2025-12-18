# Hướng Dẫn Tích Hợp Socket.IO vào Project

## Tổng Quan
Dự án đã có socket.io được cài đặt. Hướng dẫn này sẽ giúp bạn tích hợp real-time messaging vào ứng dụng chat.

---

## PHẦN 1: BACKEND - Sửa Server.js

### Bước 1: Sửa file `social-backend/server.js`

**Vấn đề hiện tại:** File đang tạo `app` mới ở dòng 2, nhưng lại import `app` từ socket/index.js ở dòng 20, gây conflict.

**Cách sửa:**
1. Xóa dòng 2: `const app = express();`
2. Xóa dòng 4: `const path = require('path');` (nếu chưa dùng ở đâu khác)
3. Thêm lại `const path = require('path');` sau khi import app từ socket
4. Đảm bảo import từ socket/index.js được đặt TRƯỚC khi sử dụng `app`

**Code mẫu sau khi sửa:**
```javascript
const express = require('express')
const dotenv = require("dotenv");
const path = require('path');
const sequelize = require('../social-backend/src/config/db')
const cookieParser = require('cookie-parser')
const cors = require('cors');
// Import socket TRƯỚC (sẽ có app, server, io)
const { io, server, app } = require('./socket/index')

// Các import routes...
const authRoutes = require('./src/routes/authRoutes')
// ... các routes khác

dotenv.config();

// Middlewares
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// ... phần còn lại giữ nguyên
```

---

## PHẦN 2: BACKEND - Xử Lý Socket Events

### Bước 2: Sửa file `social-backend/socket/index.js`

**Mục tiêu:** Thêm xử lý socket events cho real-time messaging

**Các events cần xử lý:**
- `join_conversation`: User tham gia vào một conversation
- `leave_conversation`: User rời khỏi conversation
- `send_message`: Nhận tin nhắn từ client (optional, có thể dùng HTTP API)
- `typing`: User đang gõ tin nhắn
- `stop_typing`: User dừng gõ

**Code mẫu:**
```javascript
const Server = require('socket.io');
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

// Lưu trữ user socket connections (userId -> socketId)
const userSockets = new Map();

io.on('connection', async (socket) => {
    console.log(`${socket.id} connected`);

    // User kết nối với userId
    socket.on('user_connect', (userId) => {
        userSockets.set(userId, socket.id);
        socket.userId = userId;
        console.log(`User ${userId} connected with socket ${socket.id}`);
    });

    // User tham gia vào conversation
    socket.on('join_conversation', (conversationId) => {
        socket.join(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    // User rời khỏi conversation
    socket.on('leave_conversation', (conversationId) => {
        socket.leave(`conversation_${conversationId}`);
        console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // User đang gõ tin nhắn
    socket.on('typing', (data) => {
        const { conversationId, userId } = data;
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
            userId,
            conversationId
        });
    });

    // User dừng gõ
    socket.on('stop_typing', (data) => {
        const { conversationId, userId } = data;
        socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
            userId,
            conversationId
        });
    });

    // Xử lý disconnect
    socket.on('disconnect', () => {
        if (socket.userId) {
            userSockets.delete(socket.userId);
        }
        console.log(`${socket.id} disconnected`);
    });
});

module.exports = {
    io,
    server,
    app,
};
```

---

## PHẦN 3: BACKEND - Emit Socket Events khi có tin nhắn mới

### Bước 3: Sửa file `social-backend/src/controllers/messageController.js`

**Mục tiêu:** Sau khi tạo tin nhắn thành công, emit socket event để gửi tin nhắn real-time đến các user trong conversation.

**Cách làm:**
1. Import `io` từ socket/index.js
2. Trong hàm `sendMessage`, sau khi tạo message thành công, emit event `new_message` đến room của conversation
3. Include thông tin sender trong message data

**Code mẫu:**
```javascript
const { Message, User, Conversation, ConversationMembers } = require('../models/index');
const { Op } = require('sequelize');
const { io } = require('../../socket/index'); // Import io

const sendMessage = async (req, res) => {
    const userId = req.userId;
    const { conversationId, content, type } = req.body;
    try {
        // ... code kiểm tra conversation và quyền ...

        // Tạo tin nhắn
        const message = await Message.create({
            senderId: userId,
            conversationId,
            content,
            messageType: type || 'text'
        });

        // Lấy thông tin đầy đủ của message với sender
        const messageWithSender = await Message.findByPk(message.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }
            ]
        });

        // Cập nhật lại tin nhắn cuối cùng của chat
        await Conversation.update({
            lastMessageId: message.id
        }, {
            where: { id: conversationId }
        });

        // Emit socket event để gửi tin nhắn real-time
        io.to(`conversation_${conversationId}`).emit('new_message', {
            message: messageWithSender
        });

        // Emit event để cập nhật danh sách conversations
        io.to(`conversation_${conversationId}`).emit('conversation_updated', {
            conversationId,
            lastMessage: messageWithSender
        });

        return res.status(200).json({ 
            message: "Tin nhắn đã được gửi", 
            messageId: message.id,
            data: messageWithSender
        });
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

// Tương tự cho updateMessage và deleteMessage
const updateMessage = async (req, res) => {
    // ... code cập nhật ...
    
    // Sau khi cập nhật thành công
    const updatedMessage = await Message.findByPk(messageId, {
        include: [
            {
                model: User,
                as: 'sender',
                attributes: ['id', 'username', 'displayName', 'avatar']
            }
        ]
    });

    // Emit event
    io.to(`conversation_${updatedMessage.conversationId}`).emit('message_updated', {
        message: updatedMessage
    });

    return res.status(200).json({ message: "Tin nhắn đã được cập nhật" });
}

const deleteMessage = async (req, res) => {
    // ... code xóa ...
    
    // Lưu conversationId trước khi xóa
    const conversationId = message.conversationId;
    
    // Xóa tin nhắn
    await Message.destroy({ where: { id: messageId } });
    
    // Emit event
    io.to(`conversation_${conversationId}`).emit('message_deleted', {
        messageId: messageId,
        conversationId: conversationId
    });

    return res.status(200).json({ message: "Tin nhắn đã được xóa" });
}
```

---

## PHẦN 4: FRONTEND - Kết nối Socket

### Bước 4: Tạo Socket Connection trong `Messenger.jsx`

**Mục tiêu:** Kết nối với socket server và xử lý real-time events

**Các bước:**

1. **Import socket.io-client:**
```javascript
import { io } from 'socket.io-client';
```

2. **Tạo socket connection và state:**
```javascript
const [socket, setSocket] = useState(null);
```

3. **Kết nối socket khi component mount:**
```javascript
useEffect(() => {
    // Lấy userId từ token hoặc từ API
    const token = localStorage.getItem("accessToken");
    // Decode token để lấy userId (hoặc gọi API để lấy user info)
    // Giả sử bạn có cách lấy userId
    
    // Tạo socket connection
    const newSocket = io('http://localhost:5001', {
        auth: {
            token: token
        },
        transports: ['websocket', 'polling']
    });

    // Gửi userId khi kết nối
    newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        // Lấy userId từ token hoặc từ state/context
        // newSocket.emit('user_connect', userId);
    });

    setSocket(newSocket);

    // Cleanup khi unmount
    return () => {
        newSocket.close();
    };
}, []);
```

4. **Join conversation khi chọn conversation:**
```javascript
useEffect(() => {
    if (socket && selectedConversationId) {
        // Rời conversation cũ (nếu có)
        // Join conversation mới
        socket.emit('join_conversation', selectedConversationId);
        
        return () => {
            socket.emit('leave_conversation', selectedConversationId);
        };
    }
}, [socket, selectedConversationId]);
```

---

## PHẦN 5: FRONTEND - Xử Lý Socket Events

### Bước 5: Listen và xử lý socket events trong `Messenger.jsx`

**Các events cần listen:**
- `new_message`: Nhận tin nhắn mới
- `message_updated`: Tin nhắn được cập nhật
- `message_deleted`: Tin nhắn bị xóa
- `conversation_updated`: Conversation được cập nhật
- `user_typing`: User đang gõ
- `user_stop_typing`: User dừng gõ

**Code mẫu:**
```javascript
// Listen cho tin nhắn mới
useEffect(() => {
    if (!socket) return;

    socket.on('new_message', (data) => {
        // Chỉ thêm tin nhắn nếu đang ở conversation đó
        if (data.message.conversationId === selectedConversationId) {
            setMessages(prev => [...prev, data.message]);
        }
        // Cập nhật danh sách conversations
        loadConversations();
    });

    socket.on('message_updated', (data) => {
        if (data.message.conversationId === selectedConversationId) {
            setMessages(prev => 
                prev.map(msg => 
                    msg.id === data.message.id ? data.message : msg
                )
            );
        }
    });

    socket.on('message_deleted', (data) => {
        if (data.conversationId === selectedConversationId) {
            setMessages(prev => 
                prev.filter(msg => msg.id !== data.messageId)
            );
        }
        loadConversations();
    });

    socket.on('conversation_updated', (data) => {
        loadConversations();
    });

    return () => {
        socket.off('new_message');
        socket.off('message_updated');
        socket.off('message_deleted');
        socket.off('conversation_updated');
    };
}, [socket, selectedConversationId]);
```

---

## PHẦN 6: FRONTEND - Gửi tin nhắn qua Socket (Optional)

### Bước 6: Sửa hàm `handleSendMessage`

**Option 1: Giữ nguyên HTTP API (khuyến nghị)**
- Giữ nguyên cách gửi qua HTTP
- Socket chỉ dùng để nhận tin nhắn real-time
- Backend sẽ emit event sau khi lưu vào DB

**Option 2: Gửi qua Socket**
```javascript
const handleSendMessage = async (selectedConversationId) => {
    if (!messageInput.trim()) return;
    
    try {
        // Gửi qua socket
        socket.emit('send_message', {
            conversationId: selectedConversationId,
            content: messageInput,
            type: 'text'
        });
        
        setMessageInput("");
        // Không cần gọi updateMessages vì sẽ nhận qua socket event
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn", error);
        alert("Lỗi khi gửi tin nhắn");
    }
}
```

**Khuyến nghị:** Dùng Option 1 (HTTP API) vì:
- Dễ xử lý lỗi
- Đảm bảo data được lưu vào DB trước
- Socket chỉ dùng để broadcast tin nhắn

---

## PHẦN 7: FRONTEND - Typing Indicator (Tùy chọn)

### Bước 7: Thêm tính năng "đang gõ..."

**State:**
```javascript
const [typingUsers, setTypingUsers] = useState({});
```

**Xử lý khi user gõ:**
```javascript
let typingTimeout;

const handleMessageInputChange = (value, cursor) => {
    // ... code hiện tại ...
    
    // Emit typing event
    if (socket && selectedConversationId) {
        socket.emit('typing', {
            conversationId: selectedConversationId,
            userId: currentUserId // userId của bạn
        });
        
        // Clear timeout cũ
        clearTimeout(typingTimeout);
        
        // Emit stop_typing sau 2 giây không gõ
        typingTimeout = setTimeout(() => {
            socket.emit('stop_typing', {
                conversationId: selectedConversationId,
                userId: currentUserId
            });
        }, 2000);
    }
};
```

**Listen typing events:**
```javascript
useEffect(() => {
    if (!socket) return;

    socket.on('user_typing', (data) => {
        if (data.conversationId === selectedConversationId) {
            setTypingUsers(prev => ({
                ...prev,
                [data.userId]: true
            }));
        }
    });

    socket.on('user_stop_typing', (data) => {
        if (data.conversationId === selectedConversationId) {
            setTypingUsers(prev => {
                const newState = { ...prev };
                delete newState[data.userId];
                return newState;
            });
        }
    });

    return () => {
        socket.off('user_typing');
        socket.off('user_stop_typing');
    };
}, [socket, selectedConversationId]);
```

**Hiển thị trong UI:**
```javascript
{Object.keys(typingUsers).length > 0 && (
    <div className="typing-indicator">
        {Object.keys(typingUsers).map(userId => (
            <span key={userId}>Đang gõ...</span>
        ))}
    </div>
)}
```

---

## TÓM TẮT CÁC BƯỚC

1. ✅ **Backend - Sửa server.js**: Xóa `const app = express()` và import app từ socket/index.js
2. ✅ **Backend - socket/index.js**: Thêm handlers cho join/leave conversation, typing
3. ✅ **Backend - messageController.js**: Emit socket events sau khi tạo/cập nhật/xóa message
4. ✅ **Frontend - Messenger.jsx**: Import socket.io-client và tạo connection
5. ✅ **Frontend - Messenger.jsx**: Join conversation khi chọn conversation
6. ✅ **Frontend - Messenger.jsx**: Listen các socket events (new_message, message_updated, etc.)
7. ✅ **Frontend - Messenger.jsx** (Optional): Thêm typing indicator

---

## LƯU Ý QUAN TRỌNG

1. **Lấy userId**: Bạn cần có cách lấy userId từ token hoặc từ API để emit `user_connect`
2. **CORS**: Đảm bảo CORS đã được cấu hình đúng trong socket/index.js
3. **Token Authentication**: Có thể thêm middleware xác thực token cho socket connection
4. **Error Handling**: Thêm xử lý lỗi cho các socket events
5. **Reconnection**: Socket.io tự động reconnect, nhưng có thể thêm logic xử lý khi reconnect

---

## KIỂM TRA

Sau khi hoàn thành, test các tính năng:
- [ ] Gửi tin nhắn và nhận real-time
- [ ] Cập nhật tin nhắn và nhận real-time
- [ ] Xóa tin nhắn và nhận real-time
- [ ] Typing indicator hoạt động (nếu có)
- [ ] Join/leave conversation đúng cách

Chúc bạn thành công! 🚀


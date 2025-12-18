# Giải Thích Chi Tiết Socket.IO Implementation

## 📋 Mục Lục
1. [Tổng Quan Kiến Trúc](#tổng-quan-kiến-trúc)
2. [Backend Socket - Phân Tích Chi Tiết](#backend-socket)
3. [Frontend Socket - Phân Tích Chi Tiết](#frontend-socket)
4. [Luồng Hoạt Động Real-time](#luồng-hoạt-động)
5. [Các Khái Niệm Quan Trọng](#khái-niệm-quan-trọng)

---

## 🏗️ Tổng Quan Kiến Trúc

### Kiến trúc tổng thể:
```
Frontend (React)          Backend (Node.js)
     │                           │
     │  HTTP Request             │
     ├───────────────────────────>│
     │                           │
     │  Socket.IO Connection     │
     ├═══════════════════════════>│
     │                           │
     │  Real-time Events         │
     │<═══════════════════════════│
```

**Socket.IO** là một thư viện cho phép giao tiếp **real-time, hai chiều** giữa client và server. Khác với HTTP (request-response), Socket.IO duy trì kết nối mở và có thể gửi dữ liệu bất cứ lúc nào.

---

## 🔧 Backend Socket

### File: `social-backend/socket/index.js`

#### 1. **Khởi Tạo Socket.IO Server**

```javascript
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
```

**Giải thích:**
- `http.createServer(app)`: Tạo HTTP server từ Express app
- `new Server(server, {...})`: Tạo Socket.IO server dựa trên HTTP server
- **CORS config**: Cho phép frontend (port 5173) kết nối đến socket server
- Socket.IO server sẽ chạy trên cùng port với HTTP server (5001)

**Tại sao cần HTTP server?**
- Socket.IO sử dụng WebSocket, nhưng WebSocket cần một HTTP connection trước
- HTTP server xử lý các request HTTP thông thường
- Socket.IO "nâng cấp" HTTP connection thành WebSocket connection

---

#### 2. **Quản Lý User Connections**

```javascript
const userSockets = new Map();
```

**Giải thích:**
- `Map`: Cấu trúc dữ liệu lưu trữ mapping giữa `userId` và `socketId`
- **Mục đích**: Biết được user nào đang online và socket ID của họ
- **Cấu trúc**: `Map<userId, socketId>`
  - Ví dụ: `Map { 1 => 'abc123', 2 => 'def456' }`

**Tại sao cần Map này?**
- Khi muốn gửi tin nhắn cho một user cụ thể (không phải toàn bộ conversation)
- Kiểm tra user có online không
- Gửi notification real-time cho user cụ thể

---

#### 3. **Event: `connection` - Khi Client Kết Nối**

```javascript
io.on('connection', async (socket) => {
    console.log(`${socket.id} connected`);
    // ... xử lý các events
});
```

**Giải thích:**
- `io.on('connection', ...)`: Lắng nghe khi có client mới kết nối
- `socket`: Đại diện cho một kết nối cụ thể từ client
- `socket.id`: ID duy nhất của socket connection này (tự động tạo bởi Socket.IO)

**Luồng hoạt động:**
1. Client mở trang web → Frontend gọi `io('http://localhost:5001')`
2. Socket.IO client tạo WebSocket connection
3. Backend nhận được event `connection`
4. Tạo `socket` object cho connection này

---

#### 4. **Event: `user_connect` - Đăng Ký User ID**

```javascript
socket.on('user_connect', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log(`${socket.id} connected to user ${userId}`);
})
```

**Giải thích:**
- **Khi nào gọi**: Frontend gửi `user_connect` sau khi socket kết nối thành công
- **Mục đích**: Liên kết `socket.id` với `userId` thực tế
- `userSockets.set(userId, socket.id)`: Lưu mapping vào Map
- `socket.userId = userId`: Lưu userId vào socket object (để dùng khi disconnect)

**Ví dụ:**
```
User có ID = 5 kết nối
→ socket.id = "abc123"
→ userSockets.set(5, "abc123")
→ socket.userId = 5
```

**Tại sao cần bước này?**
- Socket.IO chỉ biết `socket.id`, không biết `userId`
- Cần mapping để biết user nào đang online
- Khi user disconnect, có thể xóa khỏi Map

---

#### 5. **Event: `join_conversation` - Tham Gia Conversation**

```javascript
socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`${socket.id} joined conversation ${conversationId}`);
})
```

**Giải thích:**
- **Socket.IO Rooms**: Cơ chế nhóm các socket connections lại với nhau
- `socket.join('room_name')`: Thêm socket vào một room
- **Room name**: `conversation_${conversationId}` (ví dụ: `conversation_1`)

**Ví dụ:**
```
Conversation ID = 10
→ socket.join('conversation_10')
→ Tất cả socket trong room này sẽ nhận được events gửi đến room này
```

**Tại sao dùng Rooms?**
- Khi gửi tin nhắn trong conversation, chỉ cần emit đến room đó
- Không cần biết chính xác socket ID của từng user
- Tự động gửi đến tất cả user trong conversation

**Cơ chế hoạt động:**
```
Conversation 1: [socket1, socket2, socket3]
Conversation 2: [socket4, socket5]
Conversation 3: [socket1, socket6]

→ Khi emit đến conversation_1, chỉ socket1, socket2, socket3 nhận được
```

---

#### 6. **Event: `leave_conversation` - Rời Conversation**

```javascript
socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`${socket.id} left conversation ${conversationId}`);
})
```

**Giải thích:**
- `socket.leave('room_name')`: Xóa socket khỏi room
- **Khi nào dùng**: User đóng tab conversation, chuyển sang conversation khác

**Tại sao cần leave?**
- Tiết kiệm tài nguyên (không nhận events không cần thiết)
- Tránh nhận tin nhắn từ conversation đã rời

---

#### 7. **Event: `typing` - User Đang Gõ**

```javascript
socket.on('typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
        userId,
        conversationId,
    })
})
```

**Giải thích:**
- **`socket.to('room')`**: Emit đến tất cả socket trong room, **TRỪ** socket hiện tại
- **Tại sao dùng `.to()`?**: Không cần gửi lại cho chính người đang gõ
- **Event `user_typing`**: Frontend sẽ nhận và hiển thị "User đang gõ..."

**Luồng hoạt động:**
```
User A đang gõ trong conversation 5
→ Frontend A: socket.emit('typing', { conversationId: 5, userId: A })
→ Backend nhận được
→ Backend: socket.to('conversation_5').emit('user_typing', {...})
→ User B, C trong conversation 5 nhận được
→ Frontend B, C hiển thị "User A đang gõ..."
```

---

#### 8. **Event: `stop_typing` - Dừng Gõ**

```javascript
socket.on('stop_typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_stop_typing', {
        userId,
        conversationId,
    })
})
```

**Giải thích:**
- Tương tự `typing`, nhưng báo hiệu user đã dừng gõ
- Frontend sẽ ẩn indicator "đang gõ..."

---

#### 9. **Event: `disconnect` - Ngắt Kết Nối**

```javascript
socket.on('disconnect', () => {
    const userId = socket.userId;
    if (userId) {
        userSockets.delete(userId);
        console.log(`${socket.id} disconnected`);
    }
})
```

**Giải thích:**
- **Khi nào xảy ra**: User đóng tab, tắt trình duyệt, mất kết nối mạng
- `userSockets.delete(userId)`: Xóa user khỏi Map (không còn online)
- **Tự động**: Socket.IO tự động xóa socket khỏi tất cả rooms

**Lưu ý:**
- Socket.IO có cơ chế tự động reconnect
- Nếu reconnect thành công, sẽ tạo socket mới với ID khác
- Cần emit lại `user_connect` sau khi reconnect

---

### File: `social-backend/src/controllers/messageController.js`

#### 1. **Emit Event Khi Gửi Tin Nhắn**

```javascript
const { io } = require('../../socket/index');

const sendMessage = async (req, res) => {
    // ... tạo message trong database ...
    
    // Emit socket event
    io.to(`conversation_${conversationId}`).emit('new_message', {
        message: messageWithSender
    });
    
    // Emit event cập nhật conversation
    io.to(`conversation_${conversationId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: messageWithSender
    });
}
```

**Giải thích:**
- **`io.to('room')`**: Emit đến tất cả socket trong room
- **Khác với `socket.to()`**: 
  - `socket.to()`: Từ một socket cụ thể
  - `io.to()`: Từ server, đến tất cả socket trong room
- **Event `new_message`**: Frontend sẽ nhận và thêm tin nhắn vào UI

**Luồng hoạt động:**
```
1. User A gửi tin nhắn qua HTTP POST /api/messages/send
2. Backend lưu vào database
3. Backend emit 'new_message' đến room conversation_X
4. Tất cả user trong conversation (kể cả User A) nhận được event
5. Frontend tự động cập nhật UI, hiển thị tin nhắn mới
```

**Tại sao User A cũng nhận được?**
- User A đã join room `conversation_X`
- Khi emit đến room, tất cả socket trong room đều nhận được
- Frontend có thể filter: chỉ thêm tin nhắn nếu không phải của mình (hoặc thêm luôn để đồng bộ)

---

#### 2. **Emit Event Khi Cập Nhật Tin Nhắn**

```javascript
const updateMessage = async (req, res) => {
    // ... cập nhật message trong database ...
    
    io.to(`conversation_${updatedMessage.conversationId}`).emit('message_updated', {
        message: updatedMessage
    });
}
```

**Giải thích:**
- Tương tự `new_message`, nhưng event là `message_updated`
- Frontend sẽ cập nhật tin nhắn trong danh sách (thay vì thêm mới)

---

#### 3. **Emit Event Khi Xóa Tin Nhắn**

```javascript
const deleteMessage = async (req, res) => {
    const conversationId = message.conversationId;
    
    await Message.destroy({ where: { id: messageId } });
    
    io.to(`conversation_${conversationId}`).emit('message_deleted', {
        messageId,
        conversationId,
    });
}
```

**Giải thích:**
- **Lưu `conversationId` trước khi xóa**: Vì sau khi xóa, không thể lấy từ message nữa
- Frontend sẽ xóa tin nhắn khỏi UI dựa trên `messageId`

---

## 💻 Frontend Socket

### File: `social-frontend/src/pages/Messenger.jsx`

#### 1. **Import và State**

```javascript
import { io } from "socket.io-client";

const [socket, setSocket] = useState(null);
const [currentUserId, setCurrentUserId] = useState(null);
```

**Giải thích:**
- `socket.io-client`: Thư viện client để kết nối với Socket.IO server
- `socket`: Object đại diện cho kết nối socket
- `currentUserId`: Lưu userId để dùng khi emit events

---

#### 2. **Kết Nối Socket Khi Component Mount**

```javascript
useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    
    const fetchUserInfo = async () => {
        try {
            // Lấy thông tin user để có userId
            const res = await axios.get("http://localhost:5001/api/user/me", {
                headers: { Authorization: "Bearer " + token },
            });
            const userId = res.data.user.id;
            setCurrentUserId(userId);
            
            // Kết nối socket
            const newSocket = io("http://localhost:5001", {
                auth: {
                    token: token,
                },
                transports: ["websocket", "polling"],
            });
            
            // Khi kết nối thành công
            newSocket.on("connect", () => {
                console.log("connected to socket", newSocket.id);
                newSocket.emit("user_connect", userId);
            });
            
            // Khi ngắt kết nối
            newSocket.on('disconnect', () => {
                console.log("disconnected from socket", newSocket.id);
            });
            
            setSocket(newSocket);
            
            // Cleanup khi unmount
            return () => {
                newSocket.close();
            };
        } catch (error) {
            console.error("Lỗi khi lấy thông tin user", error);
        }
    };
    
    fetchUserInfo();
}, []);
```

**Giải thích từng bước:**

**a) Lấy Token:**
```javascript
const token = localStorage.getItem("accessToken");
```
- Lấy token từ localStorage (đã lưu khi login)

**b) Lấy User Info:**
```javascript
const res = await axios.get("http://localhost:5001/api/user/me", ...);
const userId = res.data.user.id;
```
- Gọi API để lấy thông tin user hiện tại
- Lấy `userId` để đăng ký với socket server

**c) Tạo Socket Connection:**
```javascript
const newSocket = io("http://localhost:5001", {
    auth: { token: token },
    transports: ["websocket", "polling"],
});
```
- `io("http://localhost:5001")`: Kết nối đến socket server
- `auth: { token }`: Gửi token trong handshake (có thể dùng để xác thực ở backend)
- `transports: ["websocket", "polling"]`: 
  - Ưu tiên WebSocket (nhanh hơn)
  - Fallback về polling nếu WebSocket không khả dụng

**d) Event `connect`:**
```javascript
newSocket.on("connect", () => {
    console.log("connected to socket", newSocket.id);
    newSocket.emit("user_connect", userId);
});
```
- **Khi nào**: Socket kết nối thành công
- `newSocket.id`: ID của socket connection này
- `newSocket.emit("user_connect", userId)`: Gửi userId lên server để đăng ký

**e) Event `disconnect`:**
```javascript
newSocket.on('disconnect', () => {
    console.log("disconnected from socket", newSocket.id);
});
```
- **Khi nào**: Mất kết nối (mạng lỗi, server down, đóng tab)
- Socket.IO sẽ tự động thử reconnect

**f) Cleanup:**
```javascript
return () => {
    newSocket.close();
};
```
- **Khi nào**: Component unmount (user rời khỏi trang)
- Đóng socket connection để giải phóng tài nguyên

---

#### 3. **Join Conversation Khi Chọn Conversation**

```javascript
useEffect(() => {
    if (selectedConversationId && socket) {
        socket.emit("join_conversation", selectedConversationId);
        console.log("joined conversation", selectedConversationId);
        
        return () => {
            socket.emit("leave_conversation", selectedConversationId);
            console.log('left conversation', selectedConversationId);
        };
    }
}, [selectedConversationId, socket]);
```

**Giải thích:**
- **Khi nào chạy**: Khi `selectedConversationId` hoặc `socket` thay đổi
- **Join conversation**: Gửi event `join_conversation` với conversationId
- **Cleanup**: Khi conversation thay đổi hoặc component unmount, rời conversation cũ

**Ví dụ:**
```
User chọn conversation 5
→ socket.emit("join_conversation", 5)
→ Backend: socket.join("conversation_5")
→ User chuyển sang conversation 10
→ Cleanup: socket.emit("leave_conversation", 5)
→ socket.emit("join_conversation", 10)
```

---

#### 4. **Lắng Nghe Socket Events**

```javascript
useEffect(() => {
    if (!socket) return;
    
    // Nghe tin nhắn mới
    socket.on("new_message", (data) => {
        console.log("new message", data);
        if (data.message && data.message.conversationId === selectedConversationId) {
            setMessages((prev) => [...prev, data.message]);
        }
    });
    
    // Cập nhật tin nhắn được cập nhật
    socket.on("message_updated", (data) => {
        console.log("message updated", data);
        if (data.message && data.message.conversationId === selectedConversationId) {
            setMessages((prev) => prev.map(msg => 
                msg.id === data.message.id ? data.message : msg
            ));
        }
    });
    
    // Tin nhắn được xóa
    socket.on("message_deleted", (data) => {
        console.log("message deleted", data);
        if (data.conversationId === selectedConversationId) {
            setMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
        }
        loadConversations();
    });
    
    // Conversation được cập nhật
    socket.on("conversation_updated", (data) => {
        console.log("conversation updated", data);
        loadConversations();
    });
    
    // Cleanup: Xóa listeners
    return () => {
        socket.off("new_message");
        socket.off("message_updated");
        socket.off("message_deleted");
        socket.off("conversation_updated");
    };
}, [selectedConversationId, socket]);
```

**Giải thích từng event:**

**a) `new_message`:**
```javascript
socket.on("new_message", (data) => {
    if (data.message.conversationId === selectedConversationId) {
        setMessages((prev) => [...prev, data.message]);
    }
});
```
- **Khi nào**: Có tin nhắn mới được gửi trong conversation
- **Kiểm tra**: Chỉ thêm nếu đang ở conversation đó
- **Cập nhật UI**: Thêm tin nhắn vào danh sách

**b) `message_updated`:**
```javascript
socket.on("message_updated", (data) => {
    if (data.message.conversationId === selectedConversationId) {
        setMessages((prev) => prev.map(msg => 
            msg.id === data.message.id ? data.message : msg
        ));
    }
});
```
- **Khi nào**: Tin nhắn được chỉnh sửa
- **Cập nhật UI**: Tìm tin nhắn có cùng ID và thay thế bằng version mới

**c) `message_deleted`:**
```javascript
socket.on("message_deleted", (data) => {
    if (data.conversationId === selectedConversationId) {
        setMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
    }
    loadConversations();
});
```
- **Khi nào**: Tin nhắn bị xóa
- **Cập nhật UI**: Xóa tin nhắn khỏi danh sách
- **Reload conversations**: Cập nhật danh sách conversation (để cập nhật lastMessage)

**d) `conversation_updated`:**
```javascript
socket.on("conversation_updated", (data) => {
    loadConversations();
});
```
- **Khi nào**: Conversation có thay đổi (thêm member, đổi tên, etc.)
- **Cập nhật UI**: Reload danh sách conversations

**e) Cleanup:**
```javascript
return () => {
    socket.off("new_message");
    socket.off("message_updated");
    socket.off("message_deleted");
    socket.off("conversation_updated");
};
```
- **Tại sao cần**: Xóa listeners để tránh memory leak
- **Khi nào**: Khi `selectedConversationId` hoặc `socket` thay đổi

---

#### 5. **Gửi Tin Nhắn (Vẫn Dùng HTTP)**

```javascript
const handleSendMessage = async (selectedConversationId) => {
    if (!messageInput.trim()) return;
    
    try {
        // Gửi qua HTTP API
        const res = await axios.post(`http://localhost:5001/api/messages/send`, {
            content: messageInput,
            conversationId: selectedConversationId,
            type: 'text',
        }, {
            headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
        
        setMessageInput("");
        
        // Fallback: Nếu socket không hoạt động, reload messages
        if (!socket || !socket.connected) {
            updateMessages(selectedConversationId);
            loadConversations();
        }
        // Nếu socket hoạt động, sẽ tự động nhận qua event 'new_message'
    } catch (error) {
        console.error("Lỗi khi gửi tin nhắn", error);
        alert("Lỗi khi gửi tin nhắn");
    }
}
```

**Giải thích:**
- **Vẫn dùng HTTP**: Gửi tin nhắn qua REST API (POST request)
- **Tại sao không dùng socket?**
  - Dễ xử lý lỗi (HTTP có status code)
  - Đảm bảo data được lưu vào database trước
  - Socket chỉ dùng để broadcast (gửi đến các user khác)
- **Fallback**: Nếu socket không hoạt động, reload messages thủ công

**Luồng hoạt động:**
```
1. User gõ tin nhắn và nhấn Send
2. Frontend: POST /api/messages/send
3. Backend: Lưu vào database
4. Backend: Emit 'new_message' đến room
5. Tất cả user trong conversation (kể cả người gửi) nhận được
6. Frontend tự động cập nhật UI
```

---

## 🔄 Luồng Hoạt Động Real-time

### Scenario: User A gửi tin nhắn cho User B trong Conversation 5

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│  User A     │                    │   Backend   │                    │  User B    │
│  (Frontend) │                    │   (Server)  │                    │ (Frontend) │
└─────────────┘                    └─────────────┘                    └─────────────┘
      │                                   │                                   │
      │ 1. POST /api/messages/send       │                                   │
      │    {content: "Hello",            │                                   │
      │     conversationId: 5}           │                                   │
      ├─────────────────────────────────>│                                   │
      │                                   │                                   │
      │                                   │ 2. Lưu vào database               │
      │                                   │    Message.create(...)            │
      │                                   │                                   │
      │                                   │ 3. Emit 'new_message'            │
      │                                   │    io.to('conversation_5')       │
      │                                   │    .emit('new_message', {...})   │
      │                                   │                                   │
      │ 4. Nhận event 'new_message'      │                                   │ 4. Nhận event 'new_message'
      │<─────────────────────────────────┤                                   │<─────────────────────────────────┤
      │                                   │                                   │
      │ 5. setMessages([...prev, msg])   │                                   │ 5. setMessages([...prev, msg])
      │    (Cập nhật UI)                 │                                   │    (Cập nhật UI)
      │                                   │                                   │
```

**Chi tiết từng bước:**

1. **User A gửi tin nhắn:**
   - Frontend gọi `handleSendMessage()`
   - Gửi HTTP POST request đến `/api/messages/send`

2. **Backend xử lý:**
   - `messageController.sendMessage()` được gọi
   - Kiểm tra quyền, lưu vào database
   - Emit event `new_message` đến room `conversation_5`

3. **Tất cả user nhận được:**
   - User A và User B đều đã join room `conversation_5`
   - Cả hai đều nhận được event `new_message`
   - Frontend tự động thêm tin nhắn vào UI

**Lợi ích:**
- ✅ Real-time: Tin nhắn xuất hiện ngay lập tức
- ✅ Đồng bộ: Tất cả user thấy cùng một tin nhắn
- ✅ Không cần polling: Không cần hỏi server liên tục "có tin nhắn mới không?"

---

## 📚 Các Khái Niệm Quan Trọng

### 1. **Socket vs HTTP**

| HTTP | Socket.IO |
|------|-----------|
| Request-Response | Bi-directional |
| Client phải hỏi | Server có thể gửi bất cứ lúc nào |
| Mỗi request là connection mới | Duy trì connection mở |
| Dùng cho: API calls, form submit | Dùng cho: Chat, notifications, real-time updates |

### 2. **Socket ID vs User ID**

- **Socket ID**: ID của connection (tự động tạo, thay đổi khi reconnect)
- **User ID**: ID của user trong database (cố định)
- **Mapping**: Cần Map để liên kết socket ID với user ID

### 3. **Rooms**

- **Room**: Nhóm các socket connections lại với nhau
- **Join room**: `socket.join('room_name')`
- **Emit to room**: `io.to('room_name').emit('event', data)`
- **Tất cả socket trong room sẽ nhận được event**

### 4. **Events**

- **Emit**: Gửi event (client → server hoặc server → client)
- **On**: Lắng nghe event
- **Off**: Xóa listener

**Ví dụ:**
```javascript
// Client gửi
socket.emit('typing', { conversationId: 5 });

// Server nhận
socket.on('typing', (data) => { ... });

// Server gửi
io.to('room').emit('user_typing', data);

// Client nhận
socket.on('user_typing', (data) => { ... });
```

### 5. **Reconnection**

- Socket.IO tự động reconnect khi mất kết nối
- Khi reconnect, socket ID sẽ thay đổi
- Cần emit lại `user_connect` sau khi reconnect

### 6. **Transports**

- **WebSocket**: Nhanh, hiệu quả (ưu tiên)
- **Polling**: Fallback khi WebSocket không khả dụng
- Socket.IO tự động chọn transport phù hợp

---

## 🎯 Tóm Tắt

### Backend:
1. ✅ Tạo Socket.IO server
2. ✅ Quản lý user connections (Map)
3. ✅ Xử lý join/leave conversation (Rooms)
4. ✅ Xử lý typing indicators
5. ✅ Emit events khi có thay đổi (new_message, message_updated, etc.)

### Frontend:
1. ✅ Kết nối socket khi component mount
2. ✅ Đăng ký userId với server
3. ✅ Join conversation khi chọn conversation
4. ✅ Lắng nghe các socket events
5. ✅ Cập nhật UI real-time

### Luồng hoạt động:
1. User gửi tin nhắn qua HTTP
2. Backend lưu vào database
3. Backend emit event đến room
4. Tất cả user trong room nhận được
5. Frontend tự động cập nhật UI

---

## 🔍 Debug Tips

1. **Kiểm tra socket connection:**
   ```javascript
   console.log('Socket connected:', socket.connected);
   console.log('Socket ID:', socket.id);
   ```

2. **Kiểm tra rooms:**
   - Backend: Log khi join/leave
   - Frontend: Kiểm tra có emit `join_conversation` không

3. **Kiểm tra events:**
   - Thêm `console.log` trong tất cả event handlers
   - Kiểm tra data nhận được có đúng không

4. **Network tab:**
   - Mở DevTools → Network → WS (WebSocket)
   - Xem các messages được gửi/nhận

---

Chúc bạn hiểu rõ hơn về Socket.IO! 🚀


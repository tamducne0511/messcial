# Hướng Dẫn Chi Tiết Về Socket.IO - Từng Câu Lệnh

## Mục Lục
1. [Tổng Quan Về Socket.IO](#tổng-quan)
2. [Backend - socket/index.js](#backend-socket)
3. [Frontend - Messenger.jsx](#frontend-messenger)
4. [Controllers Sử Dụng Socket](#controllers)
5. [Luồng Hoạt Động](#luồng-hoạt-động)

---

## 1. Tổng Quan Về Socket.IO {#tổng-quan}

### Socket.IO là gì?
Socket.IO là một thư viện JavaScript cho phép giao tiếp real-time (thời gian thực) giữa client và server. Thay vì client phải liên tục hỏi server "có tin nhắn mới không?" (polling), Socket.IO cho phép server tự động gửi dữ liệu đến client ngay khi có sự kiện xảy ra.

### Tại sao dùng Socket.IO?
- **Real-time**: Tin nhắn hiển thị ngay lập tức, không cần refresh
- **Hiệu quả**: Giảm tải server, không cần polling liên tục
- **Bidirectional**: Cả client và server đều có thể gửi/nhận dữ liệu
- **Rooms**: Quản lý nhóm người dùng dễ dàng

---

## 2. Backend - socket/index.js {#backend-socket}

### 2.1. Import và Khởi Tạo

```javascript
const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);
```

**Giải thích:**
- `socket.io`: Thư viện Socket.IO
- `http`: Module Node.js để tạo HTTP server
- `express`: Framework web cho Node.js
- `app`: Express application instance
- `server`: HTTP server được tạo từ Express app
- **Lý do**: Socket.IO cần một HTTP server để hoạt động, không thể chạy độc lập

```javascript
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true,
    },
});
```

**Giải thích:**
- `new Server(server)`: Tạo Socket.IO server, gắn vào HTTP server
- `cors.origin`: Cho phép frontend ở `http://localhost:5173` kết nối
- `credentials: true`: Cho phép gửi cookies/headers xác thực
- **Lý do**: Cần cấu hình CORS để frontend có thể kết nối từ domain khác

### 2.2. Lưu Trữ Socket Connections

```javascript
const userSockets = new Map();
```

**Giải thích:**
- `Map`: Cấu trúc dữ liệu key-value trong JavaScript
- **Lưu trữ**: `userId -> socket.id` (ví dụ: `{1: "abc123", 2: "def456"}`)
- **Lý do**: 
  - Cần biết socket nào thuộc về user nào
  - Khi gửi tin nhắn, cần tìm socket của user cụ thể
  - Không thể dùng `socket.id` vì nó thay đổi mỗi lần reconnect

### 2.3. Xử Lý Kết Nối

```javascript
io.on('connection', async (socket) => {
    console.log(`${socket.id} connected`);
```

**Giải thích:**
- `io.on('connection')`: Lắng nghe sự kiện khi có client kết nối
- `socket`: Object đại diện cho kết nối của một client
- `socket.id`: ID duy nhất của socket connection (tự động tạo)
- **Lý do**: Cần biết khi nào có client mới kết nối để thiết lập

### 2.4. User Connect Event

```javascript
socket.on('user_connect', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    console.log(`${socket.id} connected to user ${userId}`);
})
```

**Giải thích:**
- `socket.on('user_connect')`: Lắng nghe event 'user_connect' từ client
- `userId`: ID của user (từ client gửi lên)
- `userSockets.set(userId, socket.id)`: Lưu mapping `userId -> socket.id` vào Map
- `socket.userId = userId`: Gắn userId vào socket object để dùng sau
- **Lý do**: 
  - Client chỉ biết `socket.id` khi kết nối, không biết `userId`
  - Cần mapping để biết socket nào thuộc user nào
  - Khi user gửi tin nhắn, cần tìm socket của người nhận

### 2.5. Join Conversation

```javascript
socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`${socket.id} joined conversation ${conversationId}`);
})
```

**Giải thích:**
- `socket.on('join_conversation')`: Lắng nghe khi user muốn tham gia conversation
- `socket.join()`: Thêm socket vào một "room" (phòng)
- `conversation_${conversationId}`: Tên room (ví dụ: `conversation_1`, `conversation_2`)
- **Lý do**: 
  - Room cho phép gửi message đến nhiều người cùng lúc
  - Khi emit đến room, tất cả socket trong room đều nhận được
  - **Lưu ý**: Hiện tại không dùng room nữa, dùng `emitToConversationMembers` thay thế

### 2.6. Leave Conversation

```javascript
socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`${socket.id} left conversation ${conversationId}`);
})
```

**Giải thích:**
- `socket.leave()`: Rời khỏi room
- **Lý do**: 
  - Khi user đóng conversation, không cần nhận event từ conversation đó nữa
  - Giảm tải server, không gửi event không cần thiết

### 2.7. Typing Indicator

```javascript
socket.on('typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_typing',{
        userId,
        conversationId,
    })
})
```

**Giải thích:**
- `socket.on('typing')`: Lắng nghe khi user đang gõ
- `socket.to()`: Gửi đến room, **NHƯNG KHÔNG GỬI ĐẾN CHÍNH SOCKET ĐÓ**
- `emit('user_typing')`: Gửi event 'user_typing' đến các socket khác trong room
- **Lý do**: 
  - User A đang gõ → chỉ user B, C, D... thấy "A đang gõ..."
  - User A không cần thấy "A đang gõ..." của chính mình

### 2.8. Stop Typing

```javascript
socket.on('stop_typing', (data) => {
    const { conversationId, userId } = data;
    socket.to(`conversation_${conversationId}`).emit('user_stop_typing',{
        userId,
        conversationId,
    })
})
```

**Giải thích:**
- Tương tự `typing`, nhưng báo user đã dừng gõ
- **Lý do**: Ẩn indicator "đang gõ" khi user dừng gõ

### 2.9. Join Notifications Room

```javascript
socket.on('join_notifications', (userId) => {
    socket.join(`notifications_${userId}`);
    console.log(`${socket.id} joined notifications ${userId}`);
})
```

**Giải thích:**
- `notifications_${userId}`: Room riêng cho từng user (ví dụ: `notifications_1`)
- **Lý do**: 
  - Mỗi user có room riêng để nhận notification
  - Khi có notification mới, emit đến room `notifications_${userId}`
  - Chỉ user đó nhận được, không ảnh hưởng user khác

### 2.10. Disconnect Event

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
- `disconnect`: Event tự động khi socket ngắt kết nối
- `userSockets.delete(userId)`: Xóa mapping khi user disconnect
- **Lý do**: 
  - Khi user đóng tab/refresh, socket disconnect
  - Cần xóa khỏi Map để không gửi event đến socket không tồn tại
  - Khi reconnect, sẽ có `socket.id` mới

### 2.11. Helper Function: emitToConversationMembers

```javascript
const emitToConversationMembers = async (conversationId, eventName, data) => {
    const { ConversationMembers } = require('../src/models/index');
```

**Giải thích:**
- `async`: Hàm bất đồng bộ (cần await database query)
- `conversationId`: ID của conversation
- `eventName`: Tên event (ví dụ: 'new_message', 'message_deleted')
- `data`: Dữ liệu gửi kèm event
- **Lý do**: Tạo helper function để tái sử dụng, không lặp code

```javascript
    try {
        // Lấy danh sách tất cả members của conversation
        const members = await ConversationMembers.findAll({
            where: {
                conversationId: conversationId
            }
        });
```

**Giải thích:**
- `ConversationMembers.findAll()`: Query database lấy tất cả members
- `where: { conversationId }`: Lọc theo conversationId
- **Lý do**: Cần biết ai là member của conversation để gửi event

```javascript
        // Emit đến từng member nếu họ đang online
        members.forEach(member => {
            const socketId = userSockets.get(member.userId);
            if (socketId) {
                io.to(socketId).emit(eventName, data);
            }
        });
```

**Giải thích:**
- `members.forEach()`: Duyệt qua từng member
- `userSockets.get(member.userId)`: Lấy `socket.id` từ Map
- `if (socketId)`: Chỉ emit nếu user đang online (có socket)
- `io.to(socketId).emit()`: Gửi event đến socket cụ thể
- **Lý do**: 
  - Gửi đến từng member riêng lẻ, không cần họ phải join room
  - User có thể nhận tin nhắn dù đang ở conversation khác
  - Chỉ gửi đến user online (offline sẽ không nhận)

```javascript
    } catch (error) {
        console.error('Error emitting to conversation members:', error);
        // Fallback: emit đến room nếu có lỗi
        io.to(`conversation_${conversationId}`).emit(eventName, data);
    }
};
```

**Giải thích:**
- `catch`: Bắt lỗi nếu query database thất bại
- Fallback: Vẫn emit đến room để đảm bảo
- **Lý do**: Đảm bảo event vẫn được gửi dù có lỗi

### 2.12. Export

```javascript
module.exports = {
    io,
    server,
    app,
    emitToConversationMembers,
}
```

**Giải thích:**
- Export để các file khác sử dụng
- `io`: Socket.IO server instance
- `server`: HTTP server (dùng trong server.js)
- `app`: Express app (dùng trong server.js)
- `emitToConversationMembers`: Helper function (dùng trong controllers)

---

## 3. Frontend - Messenger.jsx {#frontend-messenger}

### 3.1. Import Socket.IO Client

```javascript
import { io } from "socket.io-client";
```

**Giải thích:**
- `socket.io-client`: Thư viện Socket.IO cho client (React)
- **Lý do**: Cần client library để kết nối với Socket.IO server

### 3.2. State Management

```javascript
const [socket, setSocket] = useState(null);
const [currentUserId, setCurrentUserId] = useState(null);
```

**Giải thích:**
- `socket`: Lưu socket connection instance
- `currentUserId`: Lưu ID của user hiện tại
- **Lý do**: Cần lưu để sử dụng trong các useEffect khác

### 3.3. Kết Nối Socket Khi Component Mount

```javascript
useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
```

**Giải thích:**
- `useEffect(() => {}, [])`: Chạy 1 lần khi component mount
- Lấy token từ localStorage
- Nếu không có token → return (không kết nối)
- **Lý do**: Cần token để xác thực

```javascript
    const fetchUserInfo = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/user/me", {
          headers: { Authorization: "Bearer " + token },
        });
        const userId = res.data.user.id;
        setCurrentUserId(userId);
```

**Giải thích:**
- Gọi API để lấy thông tin user
- Lấy `userId` từ response
- Lưu vào state
- **Lý do**: Cần `userId` để gửi lên server khi connect

```javascript
        const newSocket = io("http://localhost:5001", {
          auth: {
            token: token,
          },
          transports: ["websocket", "polling"],
        });
```

**Giải thích:**
- `io("http://localhost:5001")`: Kết nối đến Socket.IO server
- `auth.token`: Gửi token trong handshake (để server xác thực)
- `transports`: Cách kết nối
  - `websocket`: Kết nối qua WebSocket (nhanh nhất)
  - `polling`: Fallback nếu WebSocket không được hỗ trợ
- **Lý do**: 
  - Cần xác thực để biết user nào đang kết nối
  - Fallback transport để đảm bảo hoạt động trên mọi trình duyệt

```javascript
        newSocket.on("connect", () => {
          console.log("connected to socket", newSocket.id);
          newSocket.emit("user_connect", userId);
        })
```

**Giải thích:**
- `on("connect")`: Lắng nghe khi kết nối thành công
- `newSocket.id`: ID của socket connection
- `emit("user_connect", userId)`: Gửi event 'user_connect' kèm userId lên server
- **Lý do**: 
  - Server cần biết socket này thuộc về user nào
  - Server sẽ lưu mapping `userId -> socket.id`

```javascript
        newSocket.on('disconnect', () => {
          console.log("disconnected from socket", newSocket.id);
        })
        setSocket(newSocket);
```

**Giải thích:**
- `on('disconnect')`: Lắng nghe khi mất kết nối
- `setSocket(newSocket)`: Lưu socket vào state
- **Lý do**: Cần lưu để sử dụng trong các useEffect khác

```javascript
        return () => {
          newSocket.close();
        }
```

**Giải thích:**
- Cleanup function: Chạy khi component unmount
- `newSocket.close()`: Đóng kết nối socket
- **Lý do**: 
  - Tránh memory leak
  - Đóng kết nối khi không cần nữa

### 3.4. Join Conversation

```javascript
useEffect(() => {
    if (selectedConversationId && socket) {
      socket.emit("join_conversation", selectedConversationId);
      console.log("joined conversation", selectedConversationId);
      return () => {
        socket.emit("leave_conversation", selectedConversationId);
        console.log('left conversation', selectedConversationId);
      }
    }
  }, [selectedConversationId, socket]);
```

**Giải thích:**
- `useEffect(..., [selectedConversationId, socket])`: Chạy khi `selectedConversationId` hoặc `socket` thay đổi
- `socket.emit("join_conversation")`: Gửi event để join room
- Cleanup: Leave room khi unmount hoặc chuyển conversation
- **Lý do**: 
  - Khi chọn conversation, join room để nhận event
  - Khi rời/chuyển conversation, leave để không nhận event không cần thiết

### 3.5. Lắng Nghe Events

```javascript
useEffect(() => {
    if (!socket) return;
    //nghe tin nhắn mới
    socket.on("new_message", (data) => {
      console.log("new message", data);
      if (data.message && data.message.conversationId === selectedConversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    })
```

**Giải thích:**
- `socket.on("new_message")`: Lắng nghe event 'new_message' từ server
- `data`: Dữ liệu kèm theo event (chứa message object)
- `if (data.message.conversationId === selectedConversationId)`: Chỉ thêm nếu đang xem conversation đó
- `setMessages(...)`: Thêm message mới vào state
- **Lý do**: 
  - Nhận tin nhắn real-time
  - Chỉ hiển thị nếu đang xem conversation đó (tránh hiển thị nhầm)

```javascript
    //cập nhật tin nhắn được cập nhật
    socket.on("message_updated", (data) => {
      console.log("message updated", data);
      if (data.message && data.message.conversationId === selectedConversationId) {
        setMessages((prev) => prev.map(msg => msg.id === data.message.id ? data.message : msg));
      }
    })
```

**Giải thích:**
- `message_updated`: Event khi tin nhắn được chỉnh sửa
- `prev.map(...)`: Tìm message có cùng ID và thay thế bằng message mới
- **Lý do**: Cập nhật UI khi tin nhắn được sửa

```javascript
    //tin nhắn được xóa
    socket.on("message_deleted", (data) => {
      console.log("message deleted", data);
      if (data.conversationId === selectedConversationId) {
        setMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
      }
      loadConversations();
    })
```

**Giải thích:**
- `message_deleted`: Event khi tin nhắn bị xóa
- `prev.filter(...)`: Xóa message có ID trùng
- `loadConversations()`: Reload danh sách conversations (để cập nhật lastMessage)
- **Lý do**: Cập nhật UI khi tin nhắn bị xóa

```javascript
    //nghe conversation được cập nhật
    socket.on("conversation_updated", (data) => {
      console.log("conversation updated", data);
      loadConversations();
    })
```

**Giải thích:**
- `conversation_updated`: Event khi conversation có thay đổi (ví dụ: có tin nhắn mới)
- `loadConversations()`: Reload danh sách để cập nhật lastMessage
- **Lý do**: 
  - Khi có tin nhắn mới trong conversation khác, cập nhật danh sách
  - User thấy conversation có tin nhắn mới dù đang xem conversation khác

```javascript
    return () => {
      socket.off("new_message");
      socket.off("message_updated");
      socket.off("message_deleted");
      socket.off("conversation_updated");
    }
  }, [selectedConversationId, socket]);
```

**Giải thích:**
- Cleanup: Xóa tất cả listeners khi unmount hoặc dependencies thay đổi
- `socket.off()`: Gỡ bỏ listener
- **Lý do**: 
  - Tránh memory leak
  - Tránh listener cũ vẫn chạy khi dependencies thay đổi
  - Mỗi lần `selectedConversationId` thay đổi, tạo listener mới

---

## 4. Controllers Sử Dụng Socket {#controllers}

### 4.1. messageController.js

```javascript
const { io, emitToConversationMembers } = require('../../socket/index');
```

**Giải thích:**
- Import `emitToConversationMembers` helper function
- **Lý do**: Cần dùng để gửi event khi có tin nhắn mới

```javascript
// Trong sendMessage()
await emitToConversationMembers(conversationId, 'new_message',
    { message: messageWithSender });
await emitToConversationMembers(conversationId, 'conversation_updated',
    {
        conversationId,
        lastMessage: messageWithSender
    });
```

**Giải thích:**
- Gửi 2 events:
  1. `new_message`: Để hiển thị tin nhắn mới
  2. `conversation_updated`: Để cập nhật danh sách conversations
- **Lý do**: 
  - Tất cả members nhận được tin nhắn dù đang ở conversation khác
  - Danh sách conversations được cập nhật real-time

```javascript
// Trong deleteMessage()
await emitToConversationMembers(conversationId, 'message_deleted',
    {
        messageId,
        conversationId,
    });
```

**Giải thích:**
- Gửi event khi tin nhắn bị xóa
- **Lý do**: Tất cả members biết tin nhắn đã bị xóa

```javascript
// Trong updateMessage()
await emitToConversationMembers(updatedMessage.conversationId, 'message_updated',
    { message: updatedMessage });
```

**Giải thích:**
- Gửi event khi tin nhắn được sửa
- **Lý do**: Tất cả members thấy tin nhắn đã được cập nhật

---

## 5. Luồng Hoạt Động {#luồng-hoạt-động}

### 5.1. Khi User Gửi Tin Nhắn

1. **Frontend**: User gõ tin nhắn và nhấn Send
2. **Frontend**: Gọi API `POST /api/messages/send`
3. **Backend**: `messageController.sendMessage()` xử lý:
   - Tạo message trong database
   - Gọi `emitToConversationMembers()` để gửi event
4. **Backend**: `emitToConversationMembers()`:
   - Query database lấy danh sách members
   - Duyệt qua từng member, tìm `socket.id` từ `userSockets` Map
   - Emit event đến từng socket
5. **Frontend**: Tất cả members nhận event `new_message`
6. **Frontend**: Nếu đang xem conversation đó → hiển thị tin nhắn
7. **Frontend**: Nếu đang xem conversation khác → cập nhật danh sách conversations

### 5.2. Tại Sao Không Dùng Room?

**Vấn đề với Room:**
- User phải `join_conversation` mới nhận được event
- Nếu user đang ở conversation khác, họ không join room → không nhận được

**Giải pháp:**
- Dùng `emitToConversationMembers()`: Gửi trực tiếp đến socket của từng member
- Không cần user phải join room
- User nhận được tin nhắn dù đang ở conversation khác

### 5.3. Tại Sao Không Emit Cả Room Và Socket?

**Vấn đề:**
- Nếu emit cả room VÀ socket → user nhận được 2 lần (duplicate)
- Tin nhắn hiển thị 2 lần trên UI

**Giải pháp:**
- Chỉ emit đến socket, không emit đến room
- Tránh duplicate

---

## 6. Tóm Tắt

### Backend:
- **userSockets Map**: Lưu mapping `userId -> socket.id`
- **emitToConversationMembers()**: Helper function gửi event đến tất cả members
- **Events**: `new_message`, `message_updated`, `message_deleted`, `conversation_updated`

### Frontend:
- **Kết nối**: Khi component mount, kết nối socket và gửi `user_connect`
- **Join/Leave**: Join conversation khi chọn, leave khi rời
- **Listeners**: Lắng nghe events và cập nhật UI

### Lợi Ích:
- ✅ Real-time: Tin nhắn hiển thị ngay lập tức
- ✅ Hiệu quả: Không cần polling
- ✅ Linh hoạt: User nhận tin nhắn dù đang ở conversation khác
- ✅ Đồng bộ: Tất cả members thấy thay đổi cùng lúc


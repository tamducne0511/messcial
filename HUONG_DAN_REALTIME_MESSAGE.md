# Hướng dẫn: Real-time Messages cho tất cả thành viên

## Vấn đề
Trước đây, tin nhắn chỉ được gửi đến những user đang ở trong cùng một room conversation (`conversation_${conversationId}`). Điều này có nghĩa là:
- Nếu user A đang xem conversation X và user B gửi tin nhắn trong conversation Y, user A sẽ không nhận được tin nhắn đó (ngay cả khi họ là thành viên của conversation Y).

## Giải pháp
Thay vì chỉ emit đến room conversation, hệ thống giờ sẽ:
1. **Lấy danh sách tất cả members** của conversation từ database
2. **Emit trực tiếp đến socket** của từng member (nếu họ đang online)
3. **Vẫn emit đến room** để đảm bảo tương thích ngược

## Cách hoạt động

### Backend (`socket/index.js`)
- Tạo helper function `emitToConversationMembers()`:
  - Lấy danh sách tất cả members của conversation
  - Emit event đến socket của từng member (nếu online)
  - Fallback: emit đến room nếu có lỗi

### Backend (`messageController.js`)
- Cập nhật các hàm:
  - `sendMessage()`: Gửi tin nhắn đến tất cả members
  - `deleteMessage()`: Thông báo xóa đến tất cả members
  - `updateMessage()`: Thông báo cập nhật đến tất cả members

### Frontend (`Messenger.jsx`)
- Đã xử lý đúng:
  - Khi nhận `new_message`: Chỉ hiển thị nếu đang xem conversation đó
  - Khi nhận `conversation_updated`: Reload danh sách conversations để cập nhật lastMessage

## Kết quả
- ✅ User có thể nhận tin nhắn từ bất kỳ conversation nào họ là thành viên
- ✅ Không cần phải đang xem conversation đó
- ✅ Danh sách conversations được cập nhật real-time
- ✅ Tin nhắn chỉ hiển thị khi user đang xem conversation đó

## Lưu ý
- `userSockets` Map lưu trữ `userId -> socket.id`
- Khi user reconnect, `socket.id` mới sẽ được cập nhật tự động
- Nếu user offline, họ sẽ không nhận được event (nhưng có thể xem khi online lại)


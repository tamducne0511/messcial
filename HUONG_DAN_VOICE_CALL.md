# Hướng Dẫn Tích Hợp Voice Call 1-1 Miễn Phí

## 📋 Mục Lục
1. [Giới Thiệu](#giới-thiệu)
2. [Công Nghệ Sử Dụng](#công-nghệ-sử-dụng)
3. [Cài Đặt Dependencies](#cài-đặt-dependencies)
4. [Backend - Socket Events](#backend---socket-events)
5. [Frontend - WebRTC Implementation](#frontend---webrtc-implementation)
6. [Tích Hợp Vào Messenger](#tích-hợp-vào-messenger)
7. [UI Component Voice Call](#ui-component-voice-call)
8. [Troubleshooting](#troubleshooting)

---

## Giới Thiệu

Voice Call 1-1 sử dụng **WebRTC** (Web Real-Time Communication) - công nghệ miễn phí, không cần server trung gian cho việc truyền audio/video. Chúng ta chỉ cần một **signaling server** (Socket.IO) để trao đổi thông tin kết nối giữa 2 người dùng.

### Cách Hoạt Động:
1. **User A** muốn gọi **User B**
2. **User A** tạo offer (lời mời) và gửi qua Socket.IO
3. **User B** nhận offer, tạo answer và gửi lại
4. **User A** và **User B** trao đổi ICE candidates (thông tin mạng)
5. Kết nối WebRTC được thiết lập, audio được truyền trực tiếp P2P

---

## Công Nghệ Sử Dụng

- **WebRTC API**: Có sẵn trong trình duyệt, không cần cài đặt
- **Socket.IO**: Đã có sẵn trong project (dùng cho signaling)
- **Không cần server STUN/TURN** cho mạng LAN/localhost
- **Cần STUN server** cho production (miễn phí từ Google)

---

## Cài Đặt Dependencies

### Backend
Không cần cài thêm package, Socket.IO đã có sẵn.

### Frontend
Không cần cài package mới, WebRTC API có sẵn trong trình duyệt.

---

## Backend - Socket Events

Cập nhật file `social-backend/socket/index.js`:

```javascript
// Thêm vào phần socket.on('connection', ...)

// Voice call events
socket.on('voice_call_offer', async (data) => {
    const { toUserId, fromUserId, offer, callId } = data;
    console.log(`Voice call offer from ${fromUserId} to ${toUserId}`);
    
    // Tìm socket của người nhận
    const receiverSocketId = userSockets.get(toUserId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice_call_offer', {
            fromUserId,
            offer,
            callId
        });
    } else {
        // Người nhận không online
        io.to(socket.id).emit('voice_call_failed', {
            message: 'Người dùng không online',
            callId
        });
    }
});

socket.on('voice_call_answer', async (data) => {
    const { toUserId, fromUserId, answer, callId } = data;
    console.log(`Voice call answer from ${fromUserId} to ${toUserId}`);
    
    const receiverSocketId = userSockets.get(toUserId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice_call_answer', {
            fromUserId,
            answer,
            callId
        });
    }
});

socket.on('voice_call_ice_candidate', async (data) => {
    const { toUserId, fromUserId, candidate, callId } = data;
    
    const receiverSocketId = userSockets.get(toUserId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice_call_ice_candidate', {
            fromUserId,
            candidate,
            callId
        });
    }
});

socket.on('voice_call_end', async (data) => {
    const { toUserId, fromUserId, callId } = data;
    
    const receiverSocketId = userSockets.get(toUserId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice_call_end', {
            fromUserId,
            callId
        });
    }
});

socket.on('voice_call_reject', async (data) => {
    const { toUserId, fromUserId, callId } = data;
    
    const receiverSocketId = userSockets.get(toUserId);
    if (receiverSocketId) {
        io.to(receiverSocketId).emit('voice_call_reject', {
            fromUserId,
            callId
        });
    }
});
```

### Giải Thích Chi Tiết Các Socket Events

#### 1. `voice_call_offer` - Gửi Lời Mời Gọi
**Mục đích**: Khi người dùng A muốn gọi người dùng B, A tạo một "offer" (lời mời) và gửi qua socket.

**Tham số nhận vào**:
- `toUserId`: ID của người được gọi
- `fromUserId`: ID của người gọi
- `offer`: RTCSessionDescription object chứa thông tin kết nối WebRTC
- `callId`: ID duy nhất của cuộc gọi

**Cách hoạt động**:
1. Server nhận offer từ người gọi
2. Tìm socket ID của người nhận trong `userSockets` Map
3. Nếu tìm thấy: Forward offer đến người nhận
4. Nếu không tìm thấy: Gửi `voice_call_failed` về người gọi

**Khi nào được gọi**: Khi người dùng click nút "Gọi" và `startCall()` được thực thi

---

#### 2. `voice_call_answer` - Trả Lời Cuộc Gọi
**Mục đích**: Khi người được gọi chấp nhận, họ tạo "answer" và gửi lại cho người gọi.

**Tham số nhận vào**:
- `toUserId`: ID của người gọi (người sẽ nhận answer)
- `fromUserId`: ID của người trả lời
- `answer`: RTCSessionDescription object chứa thông tin kết nối
- `callId`: ID của cuộc gọi

**Cách hoạt động**:
1. Server nhận answer từ người được gọi
2. Tìm socket ID của người gọi
3. Forward answer đến người gọi để hoàn tất kết nối WebRTC

**Khi nào được gọi**: Khi người được gọi click "Chấp nhận" và `acceptCall()` được thực thi

---

#### 3. `voice_call_ice_candidate` - Trao Đổi Thông Tin Mạng
**Mục đích**: WebRTC cần trao đổi "ICE candidates" (thông tin về địa chỉ mạng) để thiết lập kết nối P2P.

**Tham số nhận vào**:
- `toUserId`: ID người nhận candidate
- `fromUserId`: ID người gửi candidate
- `candidate`: RTCIceCandidate object chứa thông tin mạng
- `callId`: ID của cuộc gọi

**Cách hoạt động**:
1. Mỗi khi WebRTC tìm thấy một địa chỉ mạng mới, nó tạo ICE candidate
2. Server forward candidate đến người kia
3. Quá trình này lặp lại nhiều lần cho đến khi tìm được đường kết nối tốt nhất

**Khi nào được gọi**: Tự động khi WebRTC phát hiện địa chỉ mạng mới (trong `onicecandidate` event)

**Lưu ý**: Có thể có nhiều candidates được trao đổi trong một cuộc gọi

---

#### 4. `voice_call_end` - Kết Thúc Cuộc Gọi
**Mục đích**: Thông báo cho cả 2 bên rằng cuộc gọi đã kết thúc.

**Tham số nhận vào**:
- `toUserId`: ID người nhận thông báo
- `fromUserId`: ID người kết thúc cuộc gọi
- `callId`: ID của cuộc gọi

**Cách hoạt động**:
1. Khi một người click "Kết thúc", gửi signal đến server
2. Server forward signal đến người kia
3. Cả 2 bên đều gọi `endCall()` để dọn dẹp resources

**Khi nào được gọi**: Khi người dùng click nút "Kết thúc" hoặc đóng modal

---

#### 5. `voice_call_reject` - Từ Chối Cuộc Gọi
**Mục đích**: Thông báo cho người gọi rằng cuộc gọi bị từ chối.

**Tham số nhận vào**:
- `toUserId`: ID của người gọi
- `fromUserId`: ID của người từ chối
- `callId`: ID của cuộc gọi

**Cách hoạt động**:
1. Người được gọi click "Từ chối"
2. Server forward signal đến người gọi
3. Người gọi nhận thông báo và đóng cuộc gọi

**Khi nào được gọi**: Khi người được gọi click nút "Từ chối"

---

## Frontend - WebRTC Implementation

### 1. Tạo Hook `useVoiceCall.js`

Tạo file `social-frontend/src/hooks/useVoiceCall.js`:

```javascript
import { useState, useRef, useEffect } from 'react';
import { io } from 'socket.io-client';

export const useVoiceCall = (socket, currentUserId) => {
    const [isCalling, setIsCalling] = useState(false);
    const [isInCall, setIsInCall] = useState(false);
    const [callStatus, setCallStatus] = useState('idle'); // idle, calling, ringing, connected, ended
    const [remoteUser, setRemoteUser] = useState(null);
    const [callId, setCallId] = useState(null);
    
    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    
    // STUN servers (miễn phí từ Google)
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };

    // Khởi tạo Peer Connection
    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(iceServers);
        
        // Xử lý ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket && remoteUser) {
                socket.emit('voice_call_ice_candidate', {
                    toUserId: remoteUser.id,
                    fromUserId: currentUserId,
                    candidate: event.candidate,
                    callId: callId
                });
            }
        };
        
        // Xử lý khi nhận remote stream
        pc.ontrack = (event) => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };
        
        // Xử lý connection state changes
        pc.onconnectionstatechange = () => {
            console.log('Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                setCallStatus('connected');
                setIsInCall(true);
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                endCall();
            }
        };
        
        return pc;
    };
```

### Giải Thích Hàm `createPeerConnection()`

**Mục đích**: Tạo một RTCPeerConnection object - đây là "cầu nối" chính để truyền audio giữa 2 người dùng.

**Tham số**: Không có (sử dụng `iceServers` từ scope ngoài)

**Giá trị trả về**: RTCPeerConnection object

**Cách hoạt động chi tiết**:

1. **Tạo Peer Connection**:
   ```javascript
   const pc = new RTCPeerConnection(iceServers);
   ```
   - Tạo object quản lý kết nối WebRTC
   - `iceServers`: Danh sách STUN servers để tìm địa chỉ mạng công khai

2. **Event `onicecandidate`** - Xử lý ICE Candidates:
   - **Khi nào xảy ra**: Mỗi khi WebRTC tìm thấy một địa chỉ mạng mới (IP, port)
   - **Mục đích**: Gửi thông tin mạng đến người kia để thiết lập kết nối P2P
   - **Cách hoạt động**:
     - Kiểm tra `event.candidate` có tồn tại không (null khi đã tìm xong)
     - Gửi candidate qua socket đến người kia
     - Quá trình này lặp lại nhiều lần cho đến khi tìm được đường tốt nhất

3. **Event `ontrack`** - Nhận Audio Stream:
   - **Khi nào xảy ra**: Khi nhận được audio stream từ người kia
   - **Mục đích**: Gán audio stream vào `<audio>` element để phát ra loa
   - **Cách hoạt động**:
     - `event.streams[0]`: Lấy stream đầu tiên (có thể có nhiều streams)
     - Gán vào `remoteAudioRef.current.srcObject` để trình duyệt tự động phát

4. **Event `onconnectionstatechange`** - Theo Dõi Trạng Thái Kết Nối:
   - **Các trạng thái có thể**:
     - `new`: Vừa tạo mới
     - `connecting`: Đang thiết lập kết nối
     - `connected`: Đã kết nối thành công ✅
     - `disconnected`: Mất kết nối
     - `failed`: Kết nối thất bại
     - `closed`: Đã đóng
   - **Cách hoạt động**:
     - Khi `connected`: Cập nhật UI, cho phép nghe/nói
     - Khi `disconnected` hoặc `failed`: Tự động gọi `endCall()` để dọn dẹp

**Ví dụ sử dụng**:
```javascript
const pc = createPeerConnection();
// pc giờ đã sẵn sàng để add tracks và tạo offer/answer
```

    // Bắt đầu cuộc gọi
    const startCall = async (targetUserId, targetUserInfo) => {
        try {
            setRemoteUser(targetUserInfo);
            setCallStatus('calling');
            setIsCalling(true);
            
            // Tạo call ID
            const newCallId = `call_${Date.now()}_${currentUserId}_${targetUserId}`;
            setCallId(newCallId);
            
            // Lấy microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            localStreamRef.current = stream;
            
            // Hiển thị audio local
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }
            
            // Tạo peer connection
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;
            
            // Thêm local stream vào peer connection
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
            
            // Tạo offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            
            // Gửi offer qua socket
            socket.emit('voice_call_offer', {
                toUserId: targetUserId,
                fromUserId: currentUserId,
                offer: offer,
                callId: newCallId
            });
            
        } catch (error) {
            console.error('Error starting call:', error);
            alert('Không thể bắt đầu cuộc gọi: ' + error.message);
            endCall();
        }
    };
```

### Giải Thích Hàm `startCall()`

**Mục đích**: Khởi tạo cuộc gọi từ phía người gọi (caller).

**Tham số**:
- `targetUserId` (string): ID của người được gọi
- `targetUserInfo` (object): Thông tin người được gọi (name, avatar, ...)

**Giá trị trả về**: Promise (async function)

**Cách hoạt động từng bước**:

1. **Cập nhật State**:
   ```javascript
   setRemoteUser(targetUserInfo);  // Lưu thông tin người được gọi
   setCallStatus('calling');       // Trạng thái: đang gọi
   setIsCalling(true);             // Đánh dấu đang trong cuộc gọi
   ```
   - Cập nhật UI để hiển thị modal "Đang gọi..."

2. **Tạo Call ID**:
   ```javascript
   const newCallId = `call_${Date.now()}_${currentUserId}_${targetUserId}`;
   ```
   - Tạo ID duy nhất cho cuộc gọi
   - Format: `call_1234567890_user1_user2`
   - Dùng để theo dõi và quản lý cuộc gọi

3. **Lấy Microphone**:
   ```javascript
   const stream = await navigator.mediaDevices.getUserMedia({ 
       audio: true, 
       video: false 
   });
   ```
   - **Yêu cầu quyền**: Trình duyệt sẽ hỏi quyền truy cập microphone
   - **Kết quả**: MediaStream object chứa audio từ microphone
   - **Lưu ý**: Nếu user từ chối, sẽ throw error

4. **Hiển Thị Audio Local** (Optional):
   ```javascript
   localAudioRef.current.srcObject = stream;
   ```
   - Gán stream vào `<audio>` element
   - Cho phép nghe lại giọng nói của mình (echo)

5. **Tạo Peer Connection**:
   ```javascript
   const pc = createPeerConnection();
   peerConnectionRef.current = pc;
   ```
   - Tạo "cầu nối" WebRTC
   - Lưu vào ref để dùng sau này

6. **Thêm Audio Tracks**:
   ```javascript
   stream.getTracks().forEach(track => {
       pc.addTrack(track, stream);
   });
   ```
   - **Mục đích**: Gửi audio từ microphone đến người kia
   - `track`: AudioTrack từ microphone
   - `stream`: MediaStream chứa track đó

7. **Tạo Offer**:
   ```javascript
   const offer = await pc.createOffer();
   await pc.setLocalDescription(offer);
   ```
   - **`createOffer()`**: Tạo SDP (Session Description Protocol) offer
   - **SDP chứa**: Thông tin về codec, bitrate, và khả năng của trình duyệt
   - **`setLocalDescription()`**: Lưu offer vào peer connection (bắt buộc)

8. **Gửi Offer Qua Socket**:
   ```javascript
   socket.emit('voice_call_offer', { ... });
   ```
   - Gửi offer đến server
   - Server sẽ forward đến người được gọi

**Flow hoàn chỉnh**:
```
User A (Caller)                    Server                    User B (Receiver)
     |                               |                              |
     |-- startCall() --------------->|                              |
     |   (getUserMedia)              |                              |
     |   (createOffer)               |                              |
     |-- emit('offer') -------------->|                              |
     |                               |-- emit('offer') ------------>|
     |                               |                              | (ringing)
```

**Lỗi có thể xảy ra**:
- User từ chối quyền microphone → `getUserMedia` throw error
- Socket không kết nối → `socket.emit` không hoạt động
- Người được gọi không online → Server trả về `voice_call_failed`

    // Chấp nhận cuộc gọi
    const acceptCall = async (offer, fromUserId, fromUserInfo) => {
        try {
            setRemoteUser(fromUserInfo);
            setCallStatus('connected');
            setIsInCall(true);
            
            // Lấy microphone
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false 
            });
            localStreamRef.current = stream;
            
            // Hiển thị audio local
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }
            
            // Tạo peer connection
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;
            
            // Thêm local stream
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });
            
            // Set remote description
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            
            // Tạo answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            
            // Gửi answer qua socket
            socket.emit('voice_call_answer', {
                toUserId: fromUserId,
                fromUserId: currentUserId,
                answer: answer,
                callId: callId
            });
            
        } catch (error) {
            console.error('Error accepting call:', error);
            alert('Không thể chấp nhận cuộc gọi: ' + error.message);
            rejectCall();
        }
    };
```

### Giải Thích Hàm `acceptCall()`

**Mục đích**: Xử lý khi người được gọi chấp nhận cuộc gọi (receiver/callee).

**Tham số**:
- `offer` (RTCSessionDescription): Offer nhận được từ người gọi
- `fromUserId` (string): ID của người gọi
- `fromUserInfo` (object): Thông tin người gọi

**Giá trị trả về**: Promise (async function)

**Cách hoạt động từng bước**:

1. **Cập nhật State**:
   ```javascript
   setRemoteUser(fromUserInfo);  // Lưu thông tin người gọi
   setCallStatus('connected');   // Trạng thái: đã kết nối
   setIsInCall(true);            // Đánh dấu đang trong cuộc gọi
   ```

2. **Lấy Microphone** (giống `startCall`):
   - Yêu cầu quyền truy cập microphone
   - Lấy audio stream từ microphone

3. **Tạo Peer Connection**:
   - Tạo RTCPeerConnection mới
   - Lưu vào `peerConnectionRef`

4. **Thêm Local Stream**:
   - Add audio tracks vào peer connection
   - Để gửi audio đến người gọi

5. **Set Remote Description** (QUAN TRỌNG):
   ```javascript
   await pc.setRemoteDescription(new RTCSessionDescription(offer));
   ```
   - **Mục đích**: Cho peer connection biết về khả năng của người gọi
   - **Bắt buộc**: Phải set trước khi tạo answer
   - **Offer chứa**: Codec, bitrate, và thông tin kết nối từ người gọi

6. **Tạo Answer**:
   ```javascript
   const answer = await pc.createAnswer();
   await pc.setLocalDescription(answer);
   ```
   - **`createAnswer()`**: Tạo SDP answer dựa trên offer
   - **Answer chứa**: Thông tin về khả năng của người nhận
   - **`setLocalDescription()`**: Lưu answer vào peer connection

7. **Gửi Answer**:
   - Gửi answer qua socket đến người gọi
   - Người gọi sẽ set remote description với answer này

**Flow hoàn chỉnh**:
```
User A (Caller)                    Server                    User B (Receiver)
     |                               |                              |
     |<-- emit('offer') --------------|                              |
     |                               |<-- emit('offer') ------------|
     |                               |                              | (ringing)
     |                               |                              |
     |                               |<-- acceptCall() -------------|
     |                               |   (createAnswer)              |
     |                               |<-- emit('answer') ------------|
     |<-- emit('answer') -------------|                              |
     |   (setRemoteDescription)      |                              |
     |                               |                              |
     |<========= ICE Candidates ============>                        |
     |                               |                              |
     |<========= Audio Stream ============>                        |
```

**Khác biệt với `startCall()`**:
- Nhận `offer` từ bên ngoài (không tự tạo)
- Phải `setRemoteDescription` trước khi tạo answer
- Tạo `answer` thay vì `offer`

**Lỗi có thể xảy ra**:
- User từ chối quyền microphone
- Offer không hợp lệ
- Socket không kết nối

    // Từ chối cuộc gọi
    const rejectCall = () => {
        if (socket && remoteUser && callId) {
            socket.emit('voice_call_reject', {
                toUserId: remoteUser.id,
                fromUserId: currentUserId,
                callId: callId
            });
        }
        endCall();
    };
```

### Giải Thích Hàm `rejectCall()`

**Mục đích**: Từ chối cuộc gọi đến (chỉ dùng cho người được gọi).

**Tham số**: Không có

**Giá trị trả về**: void

**Cách hoạt động**:
1. Gửi signal `voice_call_reject` đến người gọi qua socket
2. Gọi `endCall()` để dọn dẹp resources

**Khi nào được gọi**: Khi người được gọi click nút "Từ chối"

**Lưu ý**: 
- Chỉ gửi signal nếu có `socket`, `remoteUser`, và `callId`
- Luôn gọi `endCall()` để đảm bảo cleanup

---

```javascript
    // Kết thúc cuộc gọi
    const endCall = () => {
        // Dừng local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        
        // Đóng peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        
        // Gửi signal kết thúc
        if (socket && remoteUser && callId) {
            socket.emit('voice_call_end', {
                toUserId: remoteUser.id,
                fromUserId: currentUserId,
                callId: callId
            });
        }
        
        // Reset state
        setIsCalling(false);
        setIsInCall(false);
        setCallStatus('idle');
        setRemoteUser(null);
        setCallId(null);
        
        // Clear audio refs
        if (localAudioRef.current) {
            localAudioRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
    };
```

### Giải Thích Hàm `endCall()`

**Mục đích**: Dọn dẹp tất cả resources và reset state khi kết thúc cuộc gọi.

**Tham số**: Không có

**Giá trị trả về**: void

**Cách hoạt động từng bước**:

1. **Dừng Local Stream**:
   ```javascript
   localStreamRef.current.getTracks().forEach(track => track.stop());
   ```
   - **Mục đích**: Tắt microphone, giải phóng tài nguyên
   - **`track.stop()`**: Dừng track và giải phóng device
   - **Quan trọng**: Nếu không stop, microphone vẫn bị chiếm dụng

2. **Đóng Peer Connection**:
   ```javascript
   peerConnectionRef.current.close();
   ```
   - **Mục đích**: Đóng kết nối WebRTC
   - **Kết quả**: Ngừng trao đổi audio, giải phóng network resources
   - **Lưu ý**: Sau khi close, không thể dùng lại peer connection

3. **Gửi Signal Kết Thúc**:
   - Thông báo cho người kia rằng cuộc gọi đã kết thúc
   - Người kia cũng sẽ gọi `endCall()` khi nhận signal

4. **Reset State**:
   ```javascript
   setIsCalling(false);
   setIsInCall(false);
   setCallStatus('idle');
   setRemoteUser(null);
   setCallId(null);
   ```
   - Đưa tất cả state về trạng thái ban đầu
   - Ẩn modal, reset UI

5. **Clear Audio Refs**:
   ```javascript
   localAudioRef.current.srcObject = null;
   remoteAudioRef.current.srcObject = null;
   ```
   - Xóa audio streams khỏi audio elements
   - Đảm bảo không còn audio nào được phát

**Khi nào được gọi**:
- User click "Kết thúc"
- User click "Từ chối"
- Nhận signal `voice_call_end` từ người kia
- Connection state thay đổi thành `disconnected` hoặc `failed`
- Component unmount (cleanup)

**Lưu ý quan trọng**:
- Luôn gọi `endCall()` khi kết thúc cuộc gọi để tránh memory leak
- Nếu không stop tracks, microphone sẽ bị chiếm dụng
- Nếu không close peer connection, network resources sẽ bị giữ lại

---

```javascript
    // Tắt/bật microphone
    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    };
```

### Giải Thích Hàm `toggleMute()`

**Mục đích**: Tắt/bật microphone trong khi đang gọi (mute/unmute).

**Tham số**: Không có

**Giá trị trả về**: void

**Cách hoạt động**:
1. Kiểm tra `localStreamRef.current` có tồn tại không
2. Lấy tất cả audio tracks từ stream
3. Toggle `track.enabled`:
   - `true`: Microphone hoạt động (unmute)
   - `false`: Microphone tắt (mute)

**Khi nào được gọi**: Khi user click nút mute/unmute trong cuộc gọi

**Lưu ý**:
- Không dừng track, chỉ disable/enable
- Audio vẫn được gửi nhưng là silence khi mute
- Có thể toggle nhiều lần trong một cuộc gọi

**Ví dụ sử dụng**:
```javascript
// Mute
toggleMute(); // track.enabled = false

// Unmute
toggleMute(); // track.enabled = true
```

    // Lắng nghe socket events
    useEffect(() => {
        if (!socket) return;

        // Nhận offer (người được gọi)
        socket.on('voice_call_offer', async (data) => {
            const { fromUserId, offer, callId: incomingCallId } = data;
            setCallId(incomingCallId);
            setCallStatus('ringing');
            // Có thể fetch user info từ API
            // setRemoteUser(userInfo);
        });

        // Nhận answer (người gọi)
        socket.on('voice_call_answer', async (data) => {
            const { fromUserId, answer } = data;
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            }
        });

        // Nhận ICE candidate
        socket.on('voice_call_ice_candidate', async (data) => {
            const { candidate } = data;
            if (peerConnectionRef.current && candidate) {
                await peerConnectionRef.current.addIceCandidate(
                    new RTCIceCandidate(candidate)
                );
            }
        });

        // Nhận signal kết thúc
        socket.on('voice_call_end', () => {
            endCall();
        });

        // Nhận signal từ chối
        socket.on('voice_call_reject', () => {
            setCallStatus('ended');
            alert('Cuộc gọi bị từ chối');
            endCall();
        });

        // Nhận signal thất bại
        socket.on('voice_call_failed', (data) => {
            alert(data.message || 'Cuộc gọi thất bại');
            endCall();
        });

        return () => {
            socket.off('voice_call_offer');
            socket.off('voice_call_answer');
            socket.off('voice_call_ice_candidate');
            socket.off('voice_call_end');
            socket.off('voice_call_reject');
            socket.off('voice_call_failed');
        };
    }, [socket, currentUserId]);
```

### Giải Thích useEffect - Socket Event Listeners

**Mục đích**: Lắng nghe các socket events từ server để xử lý cuộc gọi.

**Dependencies**: `[socket, currentUserId]` - Chạy lại khi socket hoặc currentUserId thay đổi

**Các Event Handlers**:

#### 1. `voice_call_offer` - Nhận Lời Mời Gọi
**Khi nào xảy ra**: Khi có người gọi đến

**Data nhận được**:
- `fromUserId`: ID người gọi
- `offer`: RTCSessionDescription offer
- `callId`: ID cuộc gọi

**Xử lý**:
```javascript
setCallId(incomingCallId);      // Lưu call ID
setCallStatus('ringing');        // Hiển thị "Đang rung chuông"
// TODO: Fetch user info từ API và setRemoteUser
```

**Lưu ý**: Cần fetch thông tin người gọi từ API để hiển thị trong modal

---

#### 2. `voice_call_answer` - Nhận Trả Lời
**Khi nào xảy ra**: Khi người được gọi chấp nhận (chỉ cho người gọi)

**Data nhận được**:
- `fromUserId`: ID người trả lời
- `answer`: RTCSessionDescription answer

**Xử lý**:
```javascript
peerConnectionRef.current.setRemoteDescription(
    new RTCSessionDescription(answer)
);
```
- **Mục đích**: Hoàn tất kết nối WebRTC
- **Sau khi set**: Peer connection sẽ bắt đầu trao đổi ICE candidates
- **Kết quả**: Kết nối được thiết lập, audio bắt đầu truyền

**Lưu ý**: Chỉ xử lý nếu `peerConnectionRef.current` tồn tại

---

#### 3. `voice_call_ice_candidate` - Nhận ICE Candidate
**Khi nào xảy ra**: Mỗi khi người kia tìm thấy địa chỉ mạng mới

**Data nhận được**:
- `candidate`: RTCIceCandidate object

**Xử lý**:
```javascript
peerConnectionRef.current.addIceCandidate(
    new RTCIceCandidate(candidate)
);
```
- **Mục đích**: Thêm địa chỉ mạng vào peer connection
- **Kết quả**: WebRTC sẽ thử kết nối qua địa chỉ này
- **Lưu ý**: Có thể nhận nhiều candidates trong một cuộc gọi

**Flow**:
```
User A tìm thấy IP: 192.168.1.100:50000
  → Gửi candidate đến User B
  → User B thêm candidate vào peer connection
  → WebRTC thử kết nối qua IP này
```

---

#### 4. `voice_call_end` - Nhận Signal Kết Thúc
**Khi nào xảy ra**: Khi người kia kết thúc cuộc gọi

**Xử lý**: Gọi `endCall()` để dọn dẹp

**Lưu ý**: Cả 2 bên đều gọi `endCall()` khi nhận event này

---

#### 5. `voice_call_reject` - Nhận Signal Từ Chối
**Khi nào xảy ra**: Khi người được gọi từ chối (chỉ cho người gọi)

**Xử lý**:
- Hiển thị alert "Cuộc gọi bị từ chối"
- Gọi `endCall()` để dọn dẹp

---

#### 6. `voice_call_failed` - Nhận Signal Thất Bại
**Khi nào xảy ra**: Khi cuộc gọi không thể thực hiện (người nhận không online, ...)

**Data nhận được**:
- `message`: Thông báo lỗi

**Xử lý**:
- Hiển thị alert với message
- Gọi `endCall()` để dọn dẹp

---

### Cleanup Function

```javascript
return () => {
    socket.off('voice_call_offer');
    socket.off('voice_call_answer');
    // ... remove all listeners
};
```

**Mục đích**: Xóa tất cả event listeners khi component unmount hoặc dependencies thay đổi

**Quan trọng**: Nếu không cleanup, sẽ có memory leak và listeners bị duplicate

    // Cleanup khi unmount
    useEffect(() => {
        return () => {
            endCall();
        };
    }, []);

    return {
        isCalling,
        isInCall,
        callStatus,
        remoteUser,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        localAudioRef,
        remoteAudioRef
    };
};
```

---

## UI Component Voice Call

Tạo file `social-frontend/src/components/VoiceCallModal.jsx`:

```javascript
import { useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function VoiceCallModal({ 
    isOpen, 
    callStatus, 
    remoteUser, 
    onAccept, 
    onReject, 
    onEnd, 
    onToggleMute,
    isMuted,
    localAudioRef,
    remoteAudioRef
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-24 h-24 rounded-full bg-blue-500 mx-auto mb-4 flex items-center justify-center">
                        <span className="text-white text-3xl font-bold">
                            {remoteUser?.displayName?.[0] || 'U'}
                        </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                        {remoteUser?.displayName || 'Người dùng'}
                    </h3>
                    <p className="text-gray-500 mt-2">
                        {callStatus === 'calling' && 'Đang gọi...'}
                        {callStatus === 'ringing' && 'Đang rung chuông...'}
                        {callStatus === 'connected' && 'Đang kết nối'}
                        {callStatus === 'ended' && 'Cuộc gọi đã kết thúc'}
                    </p>
                </div>

                {/* Audio elements (ẩn) */}
                <audio ref={localAudioRef} autoPlay muted />
                <audio ref={remoteAudioRef} autoPlay />

                {/* Action buttons */}
                <div className="flex items-center justify-center gap-4">
                    {callStatus === 'ringing' ? (
                        <>
                            <Button
                                onClick={onAccept}
                                className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600"
                            >
                                <Phone className="w-6 h-6 text-white" />
                            </Button>
                            <Button
                                onClick={onReject}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                            >
                                <PhoneOff className="w-6 h-6 text-white" />
                            </Button>
                        </>
                    ) : callStatus === 'connected' ? (
                        <>
                            <Button
                                onClick={onToggleMute}
                                className={`w-16 h-16 rounded-full ${
                                    isMuted ? 'bg-gray-500' : 'bg-blue-500'
                                } hover:opacity-80`}
                            >
                                {isMuted ? (
                                    <MicOff className="w-6 h-6 text-white" />
                                ) : (
                                    <Mic className="w-6 h-6 text-white" />
                                )}
                            </Button>
                            <Button
                                onClick={onEnd}
                                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                            >
                                <PhoneOff className="w-6 h-6 text-white" />
                            </Button>
                        </>
                    ) : (
                        <Button
                            onClick={onEnd}
                            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600"
                        >
                            <X className="w-6 h-6 text-white" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
```

### Giải Thích Component `VoiceCallModal`

**Mục đích**: UI component hiển thị modal cuộc gọi với các nút điều khiển.

**Props nhận vào**:

| Prop | Type | Mục đích |
|------|------|----------|
| `isOpen` | boolean | Hiển thị/ẩn modal |
| `callStatus` | string | Trạng thái cuộc gọi: 'calling', 'ringing', 'connected', 'ended' |
| `remoteUser` | object | Thông tin người kia (displayName, avatar, ...) |
| `onAccept` | function | Callback khi click "Chấp nhận" |
| `onReject` | function | Callback khi click "Từ chối" |
| `onEnd` | function | Callback khi click "Kết thúc" |
| `onToggleMute` | function | Callback khi click "Mute/Unmute" |
| `isMuted` | boolean | Trạng thái mute (true = tắt mic) |
| `localAudioRef` | ref | Ref đến `<audio>` element cho audio local |
| `remoteAudioRef` | ref | Ref đến `<audio>` element cho audio remote |

**Cấu trúc Component**:

1. **Early Return**:
   ```javascript
   if (!isOpen) return null;
   ```
   - Nếu `isOpen = false`, không render gì cả
   - Tối ưu performance

2. **Overlay Background**:
   ```javascript
   <div className="fixed inset-0 z-[100] ... bg-black/70 backdrop-blur-sm">
   ```
   - `fixed inset-0`: Phủ toàn màn hình
   - `z-[100]`: Z-index cao để hiển thị trên tất cả
   - `bg-black/70`: Nền đen mờ 70%
   - `backdrop-blur-sm`: Làm mờ background

3. **Modal Content**:
   - Avatar: Hiển thị chữ cái đầu của tên
   - Tên người dùng: `remoteUser.displayName`
   - Trạng thái: Hiển thị text tương ứng với `callStatus`

4. **Audio Elements** (Ẩn):
   ```javascript
   <audio ref={localAudioRef} autoPlay muted />
   <audio ref={remoteAudioRef} autoPlay />
   ```
   - **`localAudioRef`**: Audio từ microphone của mình (muted để không echo)
   - **`remoteAudioRef`**: Audio từ người kia (autoPlay để tự động phát)
   - **Ẩn**: Không hiển thị UI, chỉ dùng để phát audio

5. **Action Buttons - Conditional Rendering**:

   **a) Trạng thái 'ringing'** (Người được gọi):
   - **Nút "Chấp nhận"** (màu xanh lá):
     - `onClick={onAccept}`: Gọi hàm `acceptCall()`
     - Icon: Phone
   - **Nút "Từ chối"** (màu đỏ):
     - `onClick={onReject}`: Gọi hàm `rejectCall()`
     - Icon: PhoneOff

   **b) Trạng thái 'connected'** (Đang gọi):
   - **Nút "Mute/Unmute"**:
     - Màu xanh khi unmute, xám khi mute
     - `onClick={onToggleMute}`: Toggle microphone
     - Icon: Mic hoặc MicOff
   - **Nút "Kết thúc"** (màu đỏ):
     - `onClick={onEnd}`: Gọi hàm `endCall()`
     - Icon: PhoneOff

   **c) Các trạng thái khác** ('calling', 'ended'):
   - Chỉ có nút "Kết thúc" hoặc "Đóng"

**Flow UI theo trạng thái**:

```
'calling' → Hiển thị "Đang gọi..." + Nút đóng
    ↓
'ringing' → Hiển thị "Đang rung chuông..." + Nút chấp nhận/từ chối
    ↓
'connected' → Hiển thị "Đang kết nối" + Nút mute/kết thúc
    ↓
'ended' → Hiển thị "Cuộc gọi đã kết thúc" + Nút đóng
```

**Lưu ý**:
- Modal luôn ở giữa màn hình (`flex items-center justify-center`)
- Z-index cao để không bị che bởi component khác
- Audio elements phải có `autoPlay` để tự động phát
- Local audio phải `muted` để tránh echo

---

## Tích Hợp Vào Messenger

Cập nhật file `social-frontend/src/pages/Messenger.jsx`:

```javascript
import { useVoiceCall } from '@/hooks/useVoiceCall';
import VoiceCallModal from '@/components/VoiceCallModal';

// Trong component Messenger:
const {
    isCalling,
    isInCall,
    callStatus,
    remoteUser,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    localAudioRef,
    remoteAudioRef
} = useVoiceCall(socket, currentUserId);

const [isMuted, setIsMuted] = useState(false);

// Hàm gọi
const handleCallUser = (userId, userInfo) => {
    startCall(userId, userInfo);
};

// Hàm toggle mute
const handleToggleMute = () => {
    toggleMute();
    setIsMuted(!isMuted);
};

// Trong JSX, thêm nút gọi vào danh sách bạn bè:
<Button onClick={() => handleCallUser(friend.id, friend)}>
    <Phone className="w-4 h-4" />
</Button>

// Thêm VoiceCallModal vào cuối component:
{(isCalling || isInCall || callStatus === 'ringing') && (
    <VoiceCallModal
        isOpen={true}
        callStatus={callStatus}
        remoteUser={remoteUser}
        onAccept={() => {
            // Cần fetch offer từ state hoặc socket
            acceptCall(offer, remoteUser.id, remoteUser);
        }}
        onReject={rejectCall}
        onEnd={endCall}
        onToggleMute={handleToggleMute}
        isMuted={isMuted}
        localAudioRef={localAudioRef}
        remoteAudioRef={remoteAudioRef}
    />
)}
```

---

## Troubleshooting

### 1. Không nghe thấy tiếng
- **Kiểm tra quyền microphone**: Trình duyệt cần quyền truy cập microphone
- **Kiểm tra volume**: Đảm bảo volume máy tính và trình duyệt không tắt
- **Kiểm tra audio elements**: Đảm bảo `remoteAudioRef` được gán đúng

### 2. Lỗi "getUserMedia is not defined"
- **Kiểm tra HTTPS**: WebRTC yêu cầu HTTPS hoặc localhost
- **Kiểm tra trình duyệt**: Cần trình duyệt hiện đại (Chrome, Firefox, Edge)

### 3. Không kết nối được (connection failed)
- **Kiểm tra STUN servers**: Có thể cần thêm STUN server khác
- **Kiểm tra firewall**: Firewall có thể chặn kết nối P2P
- **Kiểm tra NAT**: Một số NAT cần TURN server (có thể dùng miễn phí từ Google)

### 4. Cuộc gọi bị ngắt
- **Kiểm tra socket connection**: Đảm bảo socket vẫn kết nối
- **Kiểm tra network**: Kiểm tra kết nối mạng
- **Kiểm tra peer connection state**: Log `peerConnectionRef.current.connectionState`

### 5. Chỉ nghe thấy một chiều
- **Kiểm tra local stream**: Đảm bảo local stream được add vào peer connection
- **Kiểm tra remote stream**: Đảm bảo remote stream được nhận và gán vào audio element

---

## Lưu Ý Quan Trọng

1. **Quyền truy cập**: Trình duyệt sẽ yêu cầu quyền truy cập microphone
2. **HTTPS**: WebRTC yêu cầu HTTPS trong production (localhost OK)
3. **STUN/TURN**: Cần STUN server cho production, có thể cần TURN cho một số mạng
4. **Browser Support**: Chỉ hoạt động trên trình duyệt hiện đại
5. **Firewall**: Một số firewall có thể chặn kết nối P2P

---

## Tài Nguyên Tham Khảo

- [WebRTC MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Google STUN Servers](https://developers.google.com/talk/libjingle/important_considerations)

---

## Kết Luận

Với hướng dẫn này, bạn đã có thể tích hợp voice call 1-1 miễn phí vào ứng dụng của mình. WebRTC là công nghệ mạnh mẽ và miễn phí, phù hợp cho các ứng dụng real-time communication.

**Chúc bạn thành công! 🎉**


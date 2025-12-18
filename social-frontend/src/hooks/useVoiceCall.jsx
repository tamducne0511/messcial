import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import axios from "axios";
export const useVoiceCall = (socket, currentUserId) => {
    const [isCalling, setIsCalling] = useState(false);
    const [isInCall, setIsInCall] = useState(false);
    const [callStatus, setCallStatus] = useState("idle");
    const [remoteUser, setRemoteUser] = useState(null);
    const [callId, setCallId] = useState(null);
    const [pendingOffer, setPendingOffer] = useState(null); // Lưu offer khi nhận được

    const localAudioRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const localStreamRef = useRef(null);
    const peerConnectionRef = useRef(null);

    //Stun server
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    //Khởi tạo peer connection
    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(iceServers);
        //xử lýt ice candidate
        pc.onicecandidate = (event) => {
            if (event.candidate && remoteUser && callId && socket) {
                socket.emit('voice_call_ice_candidate', {
                    toUserId: remoteUser.id,
                    fromUserId: currentUserId,
                    iceCandidate: event.candidate,
                    callId: callId,
                });
            }
        }

        //xử lý nhận remote stream
        pc.ontrack = (event) => {
            if (remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = event.streams[0];
            }
        };
        //xử lý connection state change
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
    }
    // Kiểm tra xem có microphone không
    const checkMicrophoneAvailable = async () => {
        try {
            // Kiểm tra xem API có hỗ trợ không
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Trình duyệt không hỗ trợ truy cập microphone');
            }
            
            // Lấy danh sách thiết bị
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            if (audioInputs.length === 0) {
                throw new Error('Không tìm thấy microphone. Vui lòng kết nối microphone và thử lại.');
            }
            
            return true;
        } catch (error) {
            console.error('Lỗi kiểm tra microphone:', error);
            throw error;
        }
    };

    //bắt đầu cuộc gọi, id người được gọi và thông tin người được gọi
    const startCall = async (targetUserId, targetUserInfo) => {
        try {
            // Kiểm tra microphone trước
            await checkMicrophoneAvailable();
            
            setRemoteUser(targetUserInfo);
            setCallStatus('calling');
            setIsCalling(true)
            //tạo callid
            const newCallId = `call_${Date.now()}_${currentUserId}_${targetUserId}`;
            setCallId(newCallId);
            
            //lấy micro với constraints rõ ràng hơn
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false,
                });
            } catch (mediaError) {
                // Xử lý các lỗi cụ thể
                if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
                    throw new Error('Không tìm thấy microphone. Vui lòng:\n1. Kiểm tra microphone đã được kết nối\n2. Cho phép trình duyệt truy cập microphone\n3. Kiểm tra cài đặt quyền của trình duyệt');
                } else if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
                    throw new Error('Quyền truy cập microphone bị từ chối. Vui lòng cho phép trình duyệt truy cập microphone trong cài đặt.');
                } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
                    throw new Error('Microphone đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.');
                } else {
                    throw new Error(`Không thể truy cập microphone: ${mediaError.message}`);
                }
            }
            
            localStreamRef.current = stream;
            //Hiển thị audio local
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }
            //tạo peer kếtnoois
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;
            //Thêm local Stream vào peer connection
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            })
            //tạo offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            //gửi offer đến người nhận
            socket.emit('voice_call_offer', {
                toUserId: targetUserId,
                fromUserId: currentUserId,
                offer: offer,
                callId: newCallId,
            });
        } catch (error) {
            console.error('Lỗi khi bắt đầu cuộc gọi:', error);
            // Hiển thị thông báo lỗi chi tiết
            alert(error.message || 'Lỗi khi bắt đầu cuộc gọi. Vui lòng thử lại.');
            // Reset state khi lỗi
            endCall();
        }
    }
    //chấp nhận cuộc gọi
    const acceptCall = async (offerToUse = null, fromUserId = null, fromUserInfo = null) => {
        try {
            // Kiểm tra microphone trước
            await checkMicrophoneAvailable();
            
            // Sử dụng offer từ tham số hoặc từ pendingOffer
            const offer = offerToUse || pendingOffer;
            if (!offer) {
                console.error('Không có offer để accept');
                alert('Không thể chấp nhận cuộc gọi: thiếu thông tin offer');
                return;
            }
            
            // Sử dụng thông tin từ tham số hoặc từ remoteUser hiện tại
            const userId = fromUserId || remoteUser?.id;
            const userInfo = fromUserInfo || remoteUser;
            
            if (!userId || !userInfo) {
                console.error('Thiếu thông tin người gọi');
                alert('Không thể chấp nhận cuộc gọi: thiếu thông tin người gọi');
                return;
            }
            
            setRemoteUser(userInfo);
            setCallStatus('connected');
            setIsInCall(true);
            
            //lấy micro với error handling
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                    video: false,
                });
            } catch (mediaError) {
                // Xử lý các lỗi cụ thể
                if (mediaError.name === 'NotFoundError' || mediaError.name === 'DevicesNotFoundError') {
                    throw new Error('Không tìm thấy microphone. Vui lòng:\n1. Kiểm tra microphone đã được kết nối\n2. Cho phép trình duyệt truy cập microphone\n3. Kiểm tra cài đặt quyền của trình duyệt');
                } else if (mediaError.name === 'NotAllowedError' || mediaError.name === 'PermissionDeniedError') {
                    throw new Error('Quyền truy cập microphone bị từ chối. Vui lòng cho phép trình duyệt truy cập microphone trong cài đặt.');
                } else if (mediaError.name === 'NotReadableError' || mediaError.name === 'TrackStartError') {
                    throw new Error('Microphone đang được sử dụng bởi ứng dụng khác. Vui lòng đóng ứng dụng khác và thử lại.');
                } else {
                    throw new Error(`Không thể truy cập microphone: ${mediaError.message}`);
                }
            }
            
            localStreamRef.current = stream;
            //Hiển thị audio local
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
            }
            //tạo peer kếtnoois
            const pc = createPeerConnection();
            peerConnectionRef.current = pc;
            //thêm local stream vào peer connection
            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            })
            //set remote description
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            //tạo answer
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            //gửi answer đến người gọi
            socket.emit('voice_call_answer', {
                toUserId: userId,
                fromUserId: currentUserId,
                answer: answer,
                callId: callId,
            });
            
            // Xóa pending offer sau khi đã sử dụng
            setPendingOffer(null);
        } catch (error) {
            console.error('Lỗi khi chấp nhận cuộc gọi:', error);
            alert('Lỗi khi chấp nhận cuộc gọi: ' + error.message);
            rejectCall();
        }
    }

    //từ chối cuộc gọi
    const rejectCall = () => {
        if (socket && remoteUser && callId) {
            socket.emit('voice_call_reject', {
                toUserId: remoteUser.id,
                fromUserId: currentUserId,
                callId: callId,
            });
            endCall();
        } else {
            console.error('Không thể từ chối cuộc gọi');
            alert('Không thể từ chối cuộc gọi');
        }
    }
    //kết thúc cuộc gọi
    const endCall = () => {
        //dừng local stream
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                track.stop();
            });
            localStreamRef.current = null;
        }
        //Đóng peer connection
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        //gửi signal để kết thúc cuộc gọi
        if (socket && remoteUser && callId) {
            socket.emit('voice_call_end', {
                toUserId: remoteUser.id,
                fromUserId: currentUserId,
                callId: callId,
            });
        }
        //reset state
        // Reset state
        setIsCalling(false);
        setIsInCall(false);
        setCallStatus('idle');
        setRemoteUser(null);
        setCallId(null);
        setPendingOffer(null); // Xóa pending offer

        // xóa audio trước
        if (localAudioRef.current) {
            localAudioRef.current.srcObject = null;
        }
        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }
    }
    //tắt bật micro
    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
        }
    }
    //lắng nghe socket events
    useEffect(() => {
        if (!socket) return;
        // nhận offer(người được gọi)
        socket.on('voice_call_offer', async (data) => {
            const { offer, fromUserId, callId: incomingCallId } = data;
            setCallId(incomingCallId);
            setCallStatus('ringing');
            // Lưu offer để dùng khi accept
            setPendingOffer(offer);
            //fetch user info
            try {
                const userInfo = await axios.get(`http://localhost:5001/api/user/${fromUserId}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
                    },
                });
                //set remote user
                setRemoteUser(userInfo.data.user);
            } catch (error) {
                console.error('Lỗi khi fetch user info:', error);
                // Vẫn set remoteUser với thông tin tối thiểu
                setRemoteUser({ id: fromUserId, displayName: 'Người dùng' });
            }
        })
        //Nhận answer
        socket.on('voice_call_answer', async (data) => {
            const { fromUserId, answer } = data;
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(
                    new RTCSessionDescription(answer)
                );
            }
        });

        //Nhận ice candidate
        socket.on('voice_call_ice_candidate', async (data) => {
            const { iceCandidate } = data; 
            if (peerConnectionRef.current && iceCandidate) {
                try {
                    await peerConnectionRef.current.addIceCandidate(
                        new RTCIceCandidate(iceCandidate)
                    );
                } catch (error) {
                    console.error('Lỗi khi add ICE candidate:', error);
                }
            }
        });

        //Nhận signal để kết thúc cuộc gọi
        socket.on('voice_call_end', () => {
            endCall();
        });
        //Nhận signal để từ chối cuộc gọi
        socket.on('voice_call_reject', () => {
            setCallStatus('ended');
            alert('Cuộc gọi bị từ chối');
            endCall();
        });
        //Nhận signal thất bại
        socket.on('voice_call_failed', (error) => {
            console.error('Lỗi khi thực hiện cuộc gọi:', error);
            alert('Lỗi khi thực hiện cuộc gọi');
        });
        return () => {
            socket.off('voice_call_offer');
            socket.off('voice_call_answer');
            socket.off('voice_call_ice_candidate');
            socket.off('voice_call_end');
            socket.off('voice_call_reject');
            socket.off('voice_call_failed');
        }
    }, [socket, currentUserId]);
    useEffect(() => {
        return () => {
            endCall();
        }
    }, []);
    return {
        isCalling,
        isInCall,
        callStatus,
        remoteUser,
        callId,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        localAudioRef,
        remoteAudioRef
    }

}
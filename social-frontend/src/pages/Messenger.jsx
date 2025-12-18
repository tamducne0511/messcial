import React from "react";
import { Settings, Search, Phone, Video, Info, Send, MoreVertical, Palette, Bell, Smile } from "lucide-react";
import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { UserPlus, X, Users, Trash, EllipsisVertical, Pencil, LogOut } from "lucide-react";
import { io } from "socket.io-client";
import defaultImage from "../assets/images.jpeg"
import VoiceCallModal from "@/components/VoiceCallModal";
import { useVoiceCall } from "@/hooks/useVoiceCall";
// Giả định Navbar là component tĩnh
import Navbar from "@/components/navbar";

const emojiShortcuts = {
  '<3': '❤️',
  ':)': '😊',
  ':(': '😢',
  ':|': '😐',
  ';)': '😉',
  ':P': '😛',
  ':/': '😕',
  ':*': '😘',
  '<(': '😤',
  '>:(': '😠',
  'o:)': '😇',
  ':D': '😂',
  ':O': '😮',
  ':S': '😢',
  ':T': '😡',
  ':F': '😡',
  ':G': '😡',
  ':H': '😡',
  ':I': '😡',
  ':J': '😡',
  ':K': '😡',
  ':L': '😡',
  ':M': '😡',
  ':N': '😡',
  ':Q': '😡',
  ':R': '😡',
}

export default function Messenger() {
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [otherPerson, setOtherPerson] = useState(null);
  const [searchParams] = useSearchParams();
  const conversationIdFromUrl = searchParams.get('conversationId');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [searchUserTerm, setSearchUserTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [members, setMembers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [showMoreOptionsModal, setShowMoreOptionsModal] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showEditMessageModal, setShowEditMessageModal] = useState(false);
  const [editMessageContent, setEditMessageContent] = useState("");
  const [emojiText, setEmojiText] = useState({});
  const [socket, setSocket] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const typingTimeoutRef = useRef(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchMessageTerm, setSearchMessageTerm] = useState("");
  const { isCalling, isInCall, callStatus, remoteUser, callId, startCall, acceptCall, rejectCall, endCall, toggleMute, localAudioRef, remoteAudioRef } = useVoiceCall(socket, currentUserId);
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
  //kết nối socket khi component mount
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    //lấy thông tin user để có userId
    const fetchUserInfo = async () => {
      try {
        const res = await axios.get("http://localhost:5001/api/user/me", {
          headers: { Authorization: "Bearer " + token },
        });
        const userId = res.data.user.id;
        setCurrentUserId(userId);
        //kết nối socket
        const newSocket = io("http://localhost:5001", {
          auth: {
            token: token,
          },
          transports: ["websocket", "polling"],
        });
        newSocket.on("connect", () => {
          console.log("connected to socket", newSocket.id);
          newSocket.emit("user_connect", userId);
        })
        newSocket.on('disconnect', () => {
          console.log("disconnected from socket", newSocket.id);
        })
        setSocket(newSocket);
        return () => {
          newSocket.close();
        }
      } catch (error) {
        console.error("Lỗi khi lấy thông tin user", error);
      }
    }
    fetchUserInfo();
  }, []);
  //join conversation khi chọn conversation
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
  //bắt sự kiện soket
  useEffect(() => {
    if (!socket) return;
    //nghe tin nhắn mới
    socket.on("new_message", (data) => {
      console.log("new message", data);
      if (data.message && data.message.conversationId === selectedConversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    })
    //cập nhật tin nhắn được cập nhật
    socket.on("message_updated", (data) => {
      console.log("message updated", data);
      if (data.message && data.message.conversationId === selectedConversationId) {
        setMessages((prev) => prev.map(msg => msg.id === data.message.id ? data.message : msg));
      }
    })
    //tin nhắn được xóa
    socket.on("message_deleted", (data) => {
      console.log("message deleted", data);
      if (data.conversationId === selectedConversationId) {
        setMessages((prev) => prev.filter(msg => msg.id !== data.messageId));
      }
      loadConversations();
    })
    //nghe conversation được cập nhật
    socket.on("conversation_updated", (data) => {
      console.log("conversation updated", data);
      loadConversations();
    })
    return () => {
      socket.off("new_message");
      socket.off("message_updated");
      socket.off("message_deleted");
      socket.off("conversation_updated");
    }
  }, [selectedConversationId, socket]);

  useEffect(() => {
    loadConversations();
  }, []);
  const fetchUsers = async (searchTerm) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/invite/friends`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res users:", res.data.friendsList);
      setUsers(res.data.friendsList);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm người dùng", error);
    }
  }
  useEffect(() => {
    fetchUsers();
  }, []);

  //tìm kiếm vị trí shortcut trong text
  const findShortcutPosition = (text, cursor) => {
    //duyệt từ cursor về trước để tìm shortcut
    for (let i = cursor - 1; i >= 0; i--) {
      //cắt chuỗi từ vị trí i đến cuối
      const substring = text.substring(i, cursor);
      //kiểm tra substring có match với shortcut nào không
      for (const [shortcut, emoji] of Object.entries(emojiShortcuts)) {
        if (substring.endsWith(shortcut)) {
          console.log(shortcut, emoji);
          return {
            shortcut,
            emoji,
            start: i,
            end: cursor,
          }
        }
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }
    return null;
  }
  //thay thế shortcut trong text
  const replaceShortcuts = (text, cursor) => {
    const shortcut = findShortcutPosition(text, cursor);
    if (!shortcut) return null;

    const newText =
      text.substring(0, shortcut.start) +
      shortcut.emoji +
      text.substring(shortcut.end);

    return {
      newText,
      start: shortcut.start,
      end: shortcut.end,
      emoji: shortcut.emoji,
    };
  };


  //hàm xử lý 
  const handleMessageInputChange = (value, cursor) => {
    const found = replaceShortcuts(value, cursor);
    if (found) {
      setMessageInput(found.newText);
      setEmojiText((prev) => {
        const newState = { ...prev };
        newState[value] = found.emoji;
        return newState;
      });
    }
    else {
      setMessageInput(value);
      setEmojiText((prev) => {
        const newState = { ...prev };
        return newState;
      });
    }
  }

  //tìm kiếm bạn bè fe
  const searchFriends = async (searchUserTerm) => {
    const searchTerm = searchUserTerm.toLowerCase().trim();
    try {
      console.log("users:", users);
      const friend = users.filter(user => user.username.toLowerCase().includes(searchTerm));
      setSearchResults(friend);
      console.log("searchResults:", searchResults);
    } catch (error) {
      setLoadingSearch(false);
      console.error("Lỗi khi tìm kiếm bạn bè", error);
    }
  }
  //thêm thành viên vào đoạn chat

  const addMembersToConversation = async (selectedUsers, selectedConversationId) => {
    try {
      // Tìm conversation để check type và lấy name nếu cần
      const conversation = conversations.find(c => c.id === selectedConversationId);

      const requestBody = {
        memberIds: selectedUsers.map(user => user.friendId || user.id), // Dùng friendId hoặc id
        conversationId: selectedConversationId,
      };

      // Nếu là direct chat, thêm name để đặt tên nhóm
      if (conversation && conversation.type === 'direct') {
        const groupName = prompt("Nhập tên nhóm chat:");
        if (!groupName || !groupName.trim()) {
          alert("Vui lòng nhập tên nhóm chat");
          return;
        }
        requestBody.name = groupName.trim();
      }

      const res = await axios.post(`http://localhost:5001/api/conversation_members/add-members`, requestBody, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res add members:", res.data);

      // Hiển thị thông báo chi tiết
      if (res.data.existingCount > 0) {
        const existingNames = res.data.existingUsers.map(u => u.username).join(", ");
        alert(`${res.data.message}\n\nĐã có trong nhóm: ${existingNames}`);
      } else {
        alert(res.data.message);
      }

      setSelectedUsers([]);
      setSearchUserTerm("");
      setSearchResults([]);
      setShowAddMemberModal(false);
      loadConversations();

      // Nếu chuyển từ direct sang group, reload lại conversation
      if (conversation && conversation.type === 'direct') {
        setTimeout(() => {
          handleSelectConversation(selectedConversationId);
        }, 500);
      }

      return res.data;
    } catch (error) {
      console.error("Lỗi khi thêm thành viên vào đoạn chat", error);
      const errorMessage = error.response?.data?.message || error.message;
      alert("Lỗi khi thêm thành viên vào đoạn chat: " + errorMessage);

      // Nếu có thông tin về những người đã có, hiển thị
      if (error.response?.data?.existingUsers) {
        const existingNames = error.response.data.existingUsers.map(u => u.username).join(", ");
        alert(`Những người đã có trong nhóm: ${existingNames}`);
      }
    }
  }
  //lấy danh sách thành viên đoạn chat
  const getMembers = async (conversationId) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/conversation_members/get-members/${conversationId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res members:", res.data.members);
      setMembers(res.data.members);
      setShowMembersModal(true);
    }
    catch (error) {
      console.error("Lỗi khi lấy danh sách thành viên đoạn chat", error);
      alert("Lỗi khi lấy danh sách thành viên đoạn chat");
    }
  }
  //xóa thành viên đoạn chat
  const handleRemoveMember = async (conversationId, memberId) => {
    try {
      const res = await axios.delete(`http://localhost:5001/api/conversation_members/remove-members/${conversationId}&${memberId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res remove members:", res.data);
      //hiển thị thông báo
      alert(res.data.message);
      setMembers(res.data.members);
      setShowMembersModal(false);
      loadConversations();
      return res.data;
    } catch (error) {
      console.error("Lỗi khi xóa thành viên đoạn chat", error);
      alert("Lỗi khi xóa thành viên đoạn chat");
    }
  }
  //xóa tin nhắn
  const handleDeleteMessenger = async (messageId, selectedConversationId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tin nhắn này?")) {
      return;
    }
    try {
      const res = await axios.delete(`http://localhost:5001/api/messages/${messageId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res delete message:", res.data);
      alert(res.data.message);
      setShowMoreOptionsModal(false);
      setSelectedMessageId(null);// Socket sẽ tự động cập nhật qua event 'message_updated'
      if (!socket || !socket.connected) {
        updateMessages(selectedConversationId);
      }
      return res.data;
    } catch (error) {
      console.error("Lỗi khi xóa tin nhắn", error);
      alert("Lỗi khi xóa tin nhắn: " + (error.response?.data?.message || error.message));
    }
  }

  // Cập nhật tin nhắn
  const handleUpdateMessenger = async (messageId, selectedConversationId) => {
    if (!editMessageContent.trim()) {
      alert("Vui lòng nhập nội dung tin nhắn");
      return;
    }
    try {
      const res = await axios.put(`http://localhost:5001/api/messages/${messageId}`, {
        content: editMessageContent
      }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res update message:", res.data);
      alert(res.data.message);
      setShowEditMessageModal(false);
      setEditMessageContent("");
      setSelectedMessageId(null);
      if (!socket || !socket.connected) {
        updateMessages(selectedConversationId);
      }
      return res.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật tin nhắn", error);
      alert("Lỗi khi cập nhật tin nhắn: " + (error.response?.data?.message || error.message));
    }
  }
  const handleSelectConversation = async (conversationId) => {
    setSelectedConversationId(conversationId);
    const selectedConversation = conversations.find(conversation => conversation.id === conversationId);
    console.log("selectedConversation", selectedConversation);
    console.log("selectedConversation.otherPerson.user", selectedConversation.otherPerson.user);
    setOtherPerson(selectedConversation.otherPerson.user);
    try {
      const res = await axios.get(`http://localhost:5001/api/messages/${conversationId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res messages:", res.data.messages);
      setMessages(res.data.messages);
    } catch (error) {
      console.error("Lỗi khi lấy tin nhắn", error);
    }
  }
  useEffect(() => {
    if (selectedConversationId) {
      handleSelectConversation(selectedConversationId);
    }
  }, [selectedConversationId]);

  // Tự động mở conversation khi có conversationId từ URL
  useEffect(() => {
    if (conversationIdFromUrl && conversations.length > 0) {
      const conversationId = parseInt(conversationIdFromUrl);
      const conversationExists = conversations.find(c => c.id === conversationId);
      if (conversationExists) {
        setSelectedConversationId(conversationId);
      }
    }
  }, [conversationIdFromUrl, conversations]);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const handleSendMessage = async (selectedConversationId) => {
    if (!messageInput.trim()) return;
    try {
      const res = await axios.post(`http://localhost:5001/api/messages/send`, {
        content: messageInput,
        conversationId: selectedConversationId,
        type: 'text',
      }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res", res.data);
      setMessageInput("");
      //socket tự động cập nhaatjt in nhắn
      //chủi gọi updateMessages khi socket không hoạt động
      if (!socket || !socket.connected) {
        updateMessages(selectedConversationId);
        loadConversations();
      }
      return res.data;
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn", error);
      alert("Lỗi khi gửi tin nhắn");
    }
  }
  const updateMessages = async (selectedConversationId) => {
    try {
      const res = await axios.get(`http://localhost:5001/api/messages/${selectedConversationId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res messages:", res.data.messages);
      setMessages(res.data.messages);
    }
    catch (error) {
      console.error("Lỗi khi cập nhật tin nhắn", error);
      alert("Lỗi khi cập nhật tin nhắn");
    }
  }
  //sau khi gửi tin nhắn, tôi muốn nó hiển thị lên luôn trên màn hình chat
  //lấy danh sách đoạn chat
  const loadConversations = async () => {
    const res = await axios.get("http://localhost:5001/api/conversations/", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    setConversations(res.data.result);
  };
  useEffect(() => {
    loadConversations();
  }, []);
  const handleLeaveConversation = async (conversationId) => {
    if (!window.confirm("Bạn có chắc chắn muốn rời nhóm?")) {
      return;
    }
    try {
      const res = await axios.delete(`http://localhost:5001/api/conversation_members/leave-conversation/${conversationId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res leave conversation:", res.data);
      alert(res.data.message);
      loadConversations();
      return res.data;
    } catch (error) {
      console.error("Lỗi khi rời nhóm", error);
      alert("Lỗi khi rời nhóm");
    }
  }
  // Tim kiêm tin nhắn
  const searchMessages = async (searchMessageTerm, selectedConversationId) => {
    try {
      const res = await axios.post(`http://localhost:5001/api/messages/search/${selectedConversationId}`, {
        searchTerm: searchMessageTerm
      }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res search messages:", res.data.messages);
      setSearchMessageTerm("");
      setShowSearchModal(false);
    } catch (error) {
      console.error("Lỗi khi tìm kiếm tin nhắn", error);
      alert("Lỗi khi tìm kiếm tin nhắn");
    }
  }

  console.log(conversations);
  return (
    <div className="w-full h-screen bg-[#f0f2f5] flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">

        {/* Cột trái: Danh sách conversations */}
        <div className="w-[360px] bg-white border-r flex flex-col">
          {/* Header */}
          <div className="p-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-gray-600 cursor-pointer hover:bg-gray-100 rounded-full p-1" />
              <h2 className="font-semibold text-xl">Messcial</h2>
            </div>
          </div>

          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Tìm kiếm trên Messenger"
                className="w-full bg-[#f0f2f5] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {/* Mục cuộc trò chuyện đang được chọn */}
            {conversations.map((conversation) => (
              <div key={conversation.id} className="p-3 bg-blue-50 cursor-pointer flex items-center gap-3 hover:bg-gray-100"
                onClick={() => handleSelectConversation(conversation.id)}>
                <img
                  src={conversation.type === 'group' ? conversation.avatar || defaultImage : conversation.otherPerson.user.avatar || defaultImage}
                  alt={conversation.type === 'group' ? conversation.name : conversation.otherPerson.user.username}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {conversation.type === 'group' ? conversation.name : conversation.otherPerson.user.username}
                  </p>
                  {conversation.type === 'group' && (
                    <p className="text-xs text-gray-500 truncate">{conversation.members.length + 1} thành viên</p>
                  )}
                  <p className="text-xs text-gray-500 truncate">{conversation.lastMessage || "Không có tin nhắn"}</p>
                </div>
                <span className="text-xs text-gray-400">{formatDate(conversation.otherPerson?.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- */}

        {/* Cột giữa: Chat Window (Giả định đã chọn cuộc trò chuyện) */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          {otherPerson && conversations.find(c => c.id === selectedConversationId) && (
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={otherPerson.avatar || defaultImage}
                  alt={otherPerson.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{conversations.find(c => c.id === selectedConversationId).type === 'group' ? conversations.find(c => c.id === selectedConversationId).name : otherPerson.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full" onClick={() => handleCallUser(otherPerson.id, otherPerson)}>
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          )}
          {(isCalling || isInCall || callStatus === 'ringing') && (
            <VoiceCallModal
              isOpen={true}
              callStatus={callStatus}
              remoteUser={remoteUser}
              onAccept={() => {
                // acceptCall sẽ tự động lấy offer từ pendingOffer trong hook
                acceptCall();
              }}
              onReject={rejectCall}
              onEnd={endCall}
              onToggleMute={handleToggleMute}
              isMuted={isMuted}
              localAudioRef={localAudioRef}
              remoteAudioRef={remoteAudioRef}
            />
          )}
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-[#f0f2f5]">
            {messages.length > 0 && currentUserId && (
              <div className="space-y-2">
                {messages.map((message) => {
                  const isMyMessage = message.senderId === currentUserId;

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
                    >
                      {/* Button more options ấn ra ngoài thì false */}
                      {isMyMessage && (
                        <button
                          onClick={() => {
                            setSelectedMessageId(message.id);
                            setShowMoreOptionsModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <EllipsisVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      )}
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${isMyMessage ? "bg-[#1877f2] text-white" : "bg-white text-gray-800"
                          }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs mt-1 text-gray-500">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                      {!isMyMessage && (
                        <button
                          onClick={() => {
                            setSelectedMessageId(message.id);
                            setShowMoreOptionsModal(true);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full"
                        >
                          <EllipsisVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      )}

                    </div>
                  );
                })}
              </div>
            )}

            {messages.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <p className="text-gray-500">Không có tin nhắn</p>
              </div>
            )}
          </div>
          {/* Modal more options */}
          {showMoreOptionsModal && selectedMessageId && (
            <div
              className="absolute inset-0 bg-opacity-30 flex items-center justify-center z-50"
              onClick={() => {
                setShowMoreOptionsModal(false);
                setSelectedMessageId(null);
              }}
            >
              <div
                className="bg-white rounded-lg shadow-xl min-w-[200px] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Xóa tin nhắn */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                  onClick={() => {
                    handleDeleteMessenger(selectedMessageId, selectedConversationId);
                  }}
                >
                  <Trash className="w-5 h-5" />
                  <span className="text-sm font-medium">Xóa tin nhắn</span>
                </button>
                {/* Cập nhật tin nhắn */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors border-t"
                  onClick={() => {
                    const message = messages.find(m => m.id === selectedMessageId);
                    if (message) {
                      setEditMessageContent(message.content);
                      setShowEditMessageModal(true);
                      setShowMoreOptionsModal(false);
                    }
                  }}
                >
                  <Pencil className="w-5 h-5" />
                  <span className="text-sm font-medium">Chỉnh sửa tin nhắn</span>
                </button>
              </div>
            </div>
          )}

          {/* Modal chỉnh sửa tin nhắn */}
          {showEditMessageModal && selectedMessageId && (
            <div
              className="absolute inset-0 bg-opacity-50 flex items-center justify-center z-50"
              onClick={() => {
                setShowEditMessageModal(false);
                setEditMessageContent("");
                setSelectedMessageId(null);
              }}
            >
              <div
                className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90%] p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="font-semibold text-lg mb-4">Chỉnh sửa tin nhắn</h3>
                <textarea
                  value={editMessageContent}
                  onChange={(e) => setEditMessageContent(e.target.value)}
                  className="w-full bg-[#f0f2f5] rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877f2] resize-none"
                  rows="4"
                  placeholder="Nhập nội dung tin nhắn..."
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-4">
                  <button
                    onClick={() => {
                      setShowEditMessageModal(false);
                      setEditMessageContent("");
                      setSelectedMessageId(null);
                    }}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={() => handleUpdateMessenger(selectedMessageId, selectedConversationId)}
                    className="px-4 py-2 bg-[#1877f2] hover:bg-[#166fe5] rounded-lg transition-colors"
                  >
                    Lưu
                  </button>
                </div>
              </div>
            </div>
          )}


          {/* Input Area */}
          <div className="p-3 border-t bg-white">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2 text-sm focus:outline-none"
                value={messageInput}
                onChange={(e) => {
                  const cursorPos = e.target.selectionStart;
                  handleMessageInputChange(e.target.value, cursorPos);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage(selectedConversationId);
                  }
                }}
              />
              <button
                className="p-2 text-[#1877f2] hover:bg-gray-100 rounded-full"
                onClick={() => handleSendMessage(selectedConversationId)}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* --- */}

        {/* Cột phải: Options Panel (Giả định đang hiển thị) */}
        {otherPerson && conversations.find(c => c.id === selectedConversationId) && (
          <div className="w-[360px] bg-white border-l flex flex-col">
            {/* Header */}
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{conversations.find(c => c.id === selectedConversationId).type === 'group' ? conversations.find(c => c.id === selectedConversationId).name : otherPerson.username}</h3>
              </div>
              <button
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Options List */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left"
                  onClick={() => setShowSearchModal(true)}
                >
                  <Search className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">Tìm kiếm trong cuộc trò chuyện</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left"
                  onClick={() => handleLeaveConversation(selectedConversationId)}>
                  <LogOut className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">Rời nhóm</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left"
                  onClick={() => setShowMembersModal(true)}>
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-sm" onClick={() => getMembers(selectedConversationId)}>Thành viên đoạn chat</span>
                </button>
                <button
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg text-left"
                  onClick={() => setShowAddMemberModal(true)}
                >
                  <UserPlus className="w-5 h-5 text-gray-600" />
                  <span className="text-sm">Thêm thành viên</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showSearchModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[500px] max-h-[600px] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 border-b flex items-center justify-between">
              <input
                type="text"
                placeholder="Tìm kiếm trong cuộc trò chuyện..."
                className="w-full bg-[#f0f2f5] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none"
                value={searchMessageTerm}
                onChange={(e) => setSearchMessageTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    searchMessages(searchMessageTerm, selectedConversationId);
                  }
                }}
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal danh sách thành viên */}
      {showMembersModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[500px] max-h-[600px] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Danh sách thành viên</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            {/* Danh sách thành viên */}
            <div className="flex-1 overflow-y-auto p-4">
              {members.length > 0 && (
                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.user.id} className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-gray-50">
                      <img
                        src={member.user.avatar || defaultImage}
                        alt={member.user.username}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{member.user.username}</p>
                        {member.user.displayName && (
                          <p className="text-xs text-gray-500">{member.user.displayName}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveMember(selectedConversationId, member.userId)}
                        className="p-1 hover:bg-gray-100 rounded-full"
                      >
                        <Trash className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Modal thêm thành viên */}
      {showAddMemberModal && (
        <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[500px] max-h-[600px] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Thêm thành viên</h3>
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSearchUserTerm("");
                  setSearchResults([]);
                  setSelectedUsers([]);
                }}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Search Box */}
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng..."
                  className="w-full bg-[#f0f2f5] rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none"
                  value={searchUserTerm}
                  onChange={(e) => {
                    setSearchUserTerm(e.target.value);
                    searchFriends(e.target.value);
                  }}
                />
              </div>
            </div>

            {/* Danh sách user đã chọn */}
            {selectedUsers.length > 0 && (
              <div className="p-4 border-b">
                <p className="text-sm text-gray-600 mb-2">Đã chọn ({selectedUsers.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => {
                    const userId = user.friendId || user.id; // Dùng friendId hoặc id
                    return (
                      <div
                        key={userId}
                        className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{user.username}</span>
                        <button
                          onClick={() => {
                            setSelectedUsers(selectedUsers.filter(u => (u.friendId || u.id) !== userId));
                          }}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Danh sách kết quả tìm kiếm */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingSearch ? (
                <div className="text-center py-4 text-gray-500">Đang tìm kiếm...</div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((user) => {
                    const userId = user.friendId || user.id; // Dùng friendId hoặc id
                    const isSelected = selectedUsers.some(u => (u.friendId || u.id) === userId);
                    return (
                      <div
                        key={userId}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${isSelected
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : 'hover:bg-gray-50'
                          }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedUsers(selectedUsers.filter(u => (u.friendId || u.id) !== userId));
                          } else {
                            setSelectedUsers([...selectedUsers, user]);
                          }
                        }}
                      >
                        <img
                          src={user.avatar || defaultImage}
                          alt={user.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{user.username}</p>
                          {user.displayName && (
                            <p className="text-xs text-gray-500">{user.displayName}</p>
                          )}
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : searchUserTerm ? (
                <div className="text-center py-4 text-gray-500">Không tìm thấy người dùng</div>
              ) : (
                <div className="text-center py-4 text-gray-500">Nhập tên để tìm kiếm</div>
              )}
            </div>

            {/* Footer với nút xác nhận */}
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSearchUserTerm("");
                  setSearchResults([]);
                  setSelectedUsers([]);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  addMembersToConversation(selectedUsers, selectedConversationId);
                }}
                disabled={selectedUsers.length === 0}
                className={`px-4 py-2 rounded-lg ${selectedUsers.length > 0
                  ? 'bg-[#1877f2] text-white hover:bg-[#166fe5]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Thêm ({selectedUsers.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

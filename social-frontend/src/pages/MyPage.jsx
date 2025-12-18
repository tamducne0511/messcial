import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, Send, Globe, UserPlus, MessageSquare, UserMinus } from "lucide-react";
import Navbar from "@/components/navbar";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import defaultImage from "../assets/images.jpeg"
const reactions = [
  { type: "like", icon: "👍" },
  { type: "love", icon: "❤️" },
  { type: "haha", icon: "😂" },
  { type: "wow", icon: "😮" },
  { type: "sad", icon: "😢" },
  { type: "angry", icon: "😡" },
];
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

export default function MyPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState({});
  const [showPicker, setShowPicker] = useState(null);
  const [activeCommentBox, setActiveCommentBox] = useState(null);
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [openComment, setOpenComment] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [commonFriends, setCommonFriends] = useState([])
  const [editFormData, setEditFormData] = useState({
    displayName: "",
    bio: "",
    username: "",
    phone: "",
    email: "",
  });
  const [emojiText, setEmojiText] = useState({});
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [friends, setFriends] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    fetchPosts(page, true);
  }, [id]);

  const fetchPosts = async (pageNum = 1, replace = false) => {
    try {
      setLoading(true);
      //lấy post theo userId
      const res = await axios.get(`http://localhost:5001/api/posts/user/${id}?page=${pageNum}&limit=1`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log(res.data.posts)
      //lấy url của tất cả media trong post
      //map thi sẽ lấy từng mảng url ra thành 1 mảng mới
      const allUrls = res.data.posts.flatMap(post => post.media.map(m => m.url));
      console.log(allUrls);
      //nếu replace là true thì set posts mới, ngược lại thì thêm posts mới vào posts cũ
      if (replace) {
        setPosts(res.data.posts || []);
        setProfile(res.data.profile);
        //lấy url của tất cả media trong post
      } else {
        setPosts((prev) => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPosts = res.data.posts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNewPosts];
        });
      }
      setHasMore(pageNum < res.data.totalPages);
    } catch (err) {
      console.error("Lỗi khi lấy bài post:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const fetchImages = async () => {
      const res = await axios.get(`http://localhost:5001/api/posts/images/${id}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log(res.data.images)
      setMedia(res.data.images);
    }
    fetchImages();
  }, [id])

  const fetchFriends = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/invite/friends/list/${id}`,
        {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      console.log(res.data)
      console.log(res.data.friendsList);
      setFriends(res.data.friendsList);
    } catch (error) {
      console.error("Lỗi khi lấy danh sách bạn bè:", error);
    }
  }
  useEffect(() => {
    fetchFriends();
  }, [id]);

  useEffect(() => {
    //chay moi lan trang load them bai post
    const handleScroll = () => {
      //chieu cao cua trang web - 200px, chieu cao man hinh nhin thay + usser da scroll den day
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
      if (nearBottom && !loading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage, false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [page, loading, hasMore]);

  const handleReaction = async (postId, type = "like") => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (post.myReaction === type) {
        await axios.delete(`http://localhost:5001/api/reactions/post/${postId}`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      } else {
        await axios.post(`http://localhost:5001/api/reactions/post/${postId}`, { type }, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      }
      await fetchPosts(page, false);
    } catch (err) {
      console.error("Lỗi khi thả cảm xúc:", err);
    }
  };

  const handleComment = async (postId) => {
    const content = commentInput[postId];
    if (!content) return;
    try {
      await axios.post("http://localhost:5001/api/comments/create", { postId, content }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      await fetchPosts(page, false);
    } catch (err) {
      console.error("Lỗi khi gửi comment:", err);
    }
  };

  const handleReply = async (postId, parentId) => {
    const replyKey = `${postId}-reply-${parentId}`;
    const content = commentInput[replyKey];
    if (!content) return;
    try {
      await axios.post("http://localhost:5001/api/comments/create", { postId, content, parentId }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setCommentInput((prev) => ({ ...prev, [replyKey]: "" }));
      setActiveReplyBox(null);
      await fetchPosts(page, false);
    } catch (err) {
      console.error("Lỗi khi gửi reply:", err);
    }
  };

  const handleDelete = async (postId) => {
    try {
      if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
        return;
      }
      await axios.delete(`http://localhost:5001/api/posts/delete/${postId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      await fetchPosts(1, true);
    } catch (err) {
      console.error("Lỗi khi xóa bài viết:", err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await axios.delete(`http://localhost:5001/api/comments/delete/${commentId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      await fetchPosts(page, false);
    } catch (err) {
      console.error("Lỗi khi xóa comment:", err);
    }
  };

  const handleUpdateComment = async (commentId) => {
    try {
      await axios.put(`http://localhost:5001/api/comments/update/${commentId}`, { content: editContent }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setEditingCommentId(null);
      setEditContent("");
      await fetchPosts(page, false);
    } catch (err) {
      console.error("Lỗi khi cập nhật comment:", err);
    }
  };
  const handleSendFriendRequest = async (friendId) => {
    try {
      await axios.post(`http://localhost:5001/api/invite/friends/request`, { friendId: friendId }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      })
      setProfile((prev) => ({ ...prev, iviteStatus: "Đã gửi lời mời" }));
      alert("Gửi lời mời kết bạn thành công");
    } catch (error) {
      console.error("Lỗi khi gửi lời mời kết bạn:", error);
      alert("Lỗi gửi lời mời kết bạn");
    }
  }
  const handleUnfriend = async (userId) => {
    try {
      await axios.delete(`http://localhost:5001/api/invite/friends/unfriend/${userId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setProfile((prev) => ({ ...prev, friendStatus: "Chưa kết bạn" }));
      setProfile((prev) => ({ ...prev, iviteStatus: "Chưa gửi lời mời" }));
      alert("Hủy kết bạn thành công");
    } catch (error) {
      console.error("Lỗi khi hủy kết bạn:", error);
      alert("Lỗi hủy kết bạn");
    }
  }
  const handleCancelFriendRequest = async (friendId) => {
    try {
      await axios.post(`http://localhost:5001/api/invite/friends/cancel`, { friendId: friendId }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setProfile((prev) => ({ ...prev, iviteStatus: "Chưa gửi lời mời" }));
      alert("Hủy lời mời kết bạn thành công");
    } catch (error) {
      console.error("Lỗi khi hủy lời mời kết bạn:", error);
      alert("Lỗi hủy lời mời kết bạn");
    }
  }

  const handleSendMessage = async (otherUserId) => {
    try {
      // Gọi API để tìm hoặc tạo conversation
      const res = await axios.post(
        'http://localhost:5001/api/conversations/find-or-create',
        { otherId: otherUserId },
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken")
          }
        }
      );

      const conversationId = res.data.conversation.id;

      // Chuyển đến trang Messenger với conversationId
      navigate(`/messenger?conversationId=${conversationId}`);

    } catch (error) {
      console.error("Lỗi khi tìm/tạo cuộc trò chuyện", error);
      alert("Không thể tạo cuộc trò chuyện: " + (error.response?.data?.message || error.message));
    }
  }

  // Bắt đầu chỉnh sửa profile
  const startEditProfile = () => {
    setEditFormData({
      displayName: profile?.displayName || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      email: profile?.email || "",
      username: profile?.username || "",
    });
    setIsEditingProfile(true);
  };

  // Xử lý thay đổi input
  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  // Upload avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview trước
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:5001/api/user/avatar", formData, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
          "Content-Type": "multipart/form-data",
        },
      });
      // Cập nhật avatar trong profile
      setProfile((prev) => ({ ...prev, avatar: res.data.url }));
      setAvatarPreview(null);
      alert("Cập nhật avatar thành công!");
    } catch (err) {
      console.error("Lỗi upload avatar:", err);
      alert("Lỗi upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Lưu thông tin profile
  const handleSaveProfile = async () => {
    try {
      const res = await axios.put("http://localhost:5001/api/user/me", editFormData, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      // Cập nhật profile với data mới
      setProfile((prev) => ({
        ...prev,
        displayName: res.data.user.displayName,
        bio: res.data.user.bio,
        phone: res.data.user.phone,
        email: res.data.user.email,
        username: res.data.user.username,
      }));
      setIsEditingProfile(false);
      alert("Cập nhật thông tin thành công!");
    } catch (err) {
      console.error("Lỗi cập nhật profile:", err);
      alert("Lỗi cập nhật thông tin");
    }
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setIsEditingProfile(false);
    setAvatarPreview(null);
  };

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
  // thay thế shortcut trong text
  const replaceShortcuts = (text, cursor) => {
    const shortcut = findShortcutPosition(text, cursor);
    console.log(shortcut);
    if (!shortcut) return null;
    const newText = text.substring(0, shortcut.start) + shortcut.emoji + text.substring(shortcut.end);
    console.log(newText);

    return {
      newText: newText,
      start: shortcut.start,
      end: shortcut.end,
      emoji: shortcut.emoji,
    }
  }
  //hàm xử lý thay thế shortcut trong text
  const handleCommentInputChange = (postId, value, cursor) => {
    const found = replaceShortcuts(value, cursor);

    if (found) {
      // cập nhật input với emoji đã replace
      setCommentInput((prev) => ({
        ...prev,
        [postId]: found.newText
      }));

      // hiện emoji
      setEmojiText((prev) => ({
        ...prev,
        [postId]: {
          emoji: found.emoji,
          shortcut: found.shortcut
        }
      }));
    } else {
      // không có shortcut
      setCommentInput((prev) => ({
        ...prev,
        [postId]: value
      }));

      // xóa preview
      setEmojiText((prev) => {
        const newState = { ...prev };
        delete newState[postId];
        return newState;
      });
    }
  };

  //hàm xử lý nhấn enter hoặc space
  const handleCommentKeyDown = (e, postId, callback) => {
    const value = commentInput[postId];
    const cursor = e.target.selectionStart;

    if (e.key === " " || e.key === "Enter") {
      const found = replaceShortcuts(value, cursor);
      if (found) {
        setCommentInput((prev) => ({
          ...prev,
          [postId]: found.newText
        }));

        setEmojiText((prev) => ({
          ...prev,
          [postId]: {
            emoji: found.emoji,
            shortcut: found.shortcut
          }
        }));
      }
    }

    if (e.key === "Enter") {
      e.preventDefault();
      callback(postId);
    }
  };

  const fetchCommonFriends = async () => {
    try {
      const res = await axios.get(`http://localhost:5001/api/invite/commonfriends/${id}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("commonFriends", res.data.commonFriends);
      setCommonFriends(res.data.commonFriends);
    } catch (error) {
      console.log(error.message);
      alert("Lỗi thực hiện xem danh sách bạn chung")
    }
  }
  useEffect(() => {
    fetchCommonFriends();
  }, [id]);

  const renderCommentTree = (comments, postId, parentId = null, level = 0) => {
    return comments
      .filter((c) => c.parentId === parentId)
      .map((c) => (
        <div key={c.id} className={`${level > 0 ? "ml-10" : ""} mb-2`}>
          <div className="flex gap-2">
            <img src={c.user?.avatar || "/default-avatar.png"}
              className={`rounded-full object-cover 
            ${level > 0 ? "w-8 h-8" : "w-10 h-10"}`} />
            <div className="flex-1">
              <div className="bg-[#f0f2f5] px-3 py-2 rounded-3xl max-w-[90%] flex items-center gap-5">
                <p className="font-semibold text-[14px]">{c.user?.displayName}:</p>
                {editingCommentId === c.id ? (
                  <div className="mt-1">
                    <input type="text" value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full border rounded px-2 py-1 text-sm truncate"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-1 inline-block">
                      <button onClick={() => handleUpdateComment(c.id)} className="text-xs text-[#1877f2] font-semibold">Lưu</button>
                      <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500">Hủy</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{c.content}</p>
                )}
              </div>
              <div className="flex gap-4 mt-1 ml-2 text-xs text-gray-500">
                <button className="font-semibold hover:underline" onClick={() => handleReactionComment(postId, c.id, "like")}>Thích</button>
                <button className="font-semibold hover:underline" onClick={() => setActiveReplyBox(activeReplyBox === c.id ? null : c.id)}>Phản hồi</button>
                <button onClick={() => setOpenComment(openComment === c.id ? null : c.id)} className="hover:underline">•••</button>
              </div>
              {openComment === c.id && (
                <div className="absolute mt-1 bg-white border rounded-lg shadow-lg z-20 w-36">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      setOpenComment(null); setEditingCommentId(c.id);
                      setEditContent(c.content);
                    }}>Chỉnh sửa</button>
                  <button className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-gray-100"
                    onClick={() => { setOpenComment(null); handleDeleteComment(c.id); }}>Xóa</button>
                </div>
              )}
              {activeReplyBox === c.id && (
                <div className="flex gap-2 mt-2">
                  <input type="text" placeholder="Viết phản hồi..."
                    className="flex-1 bg-[#f0f2f5] rounded-full px-3 py-1.5 text-sm"
                    value={commentInput[`${postId}-reply-${c.id}`] || ""}
                    onChange={
                      (e) => {
                        const cursorPos = e.target.selectionStart;
                        handleCommentInputChange(`${postId}-reply-${c.id}`, e.target.value, cursorPos);
                      }
                    }
                    onKeyDown={(e) => handleCommentKeyDown(e, `${postId}-reply-${c.id}`, () => handleReply(postId, c.id))} />
                  {emojiText[`${postId}-reply-${c.id}`] && (
                    <div className="absolute right-12 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                      {emojiText[`${postId}-reply-${c.id}`].emoji}
                    </div>
                  )}
                  <button onClick={() => handleReply(postId, c.id)} className="text-[#1877f2]"><Send className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          </div>
          {renderCommentTree(comments, postId, c.id, level + 1)}
        </div>
      ));
  };

  if (loading && posts.length === 0) {
    return (
      <div className="bg-[#f0f2f5] min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1877f2] border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[1800px] bg-[#f0f2f5] min-h-screen">
      <Navbar />

      {/* Profile Header */}
      {profile && (
        <div className="w-[1800px] mx-auto bg-white shadow">
          {/* Cover */}
          <div className="h-[300px] bg-gradient-to-r from-[#1877f2] to-[#42b72a] max-w-[1300px] mx-auto rounded-b-lg"></div>

          {/* Info */}
          <div className="max-w-[1300px] mx-auto px-4 pb-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-[60px]">
              {/* Avatar với nút đổi ảnh */}
              <div className="relative">
                <img
                  src={avatarPreview || profile.avatar || defaultImage}
                  className="w-[150px] h-[150px] rounded-full border-4 border-white object-cover shadow-lg"
                />
                {profile.friendStatus === "Chính bạn" && (
                  <label className="absolute bottom-2 right-2 w-9 h-9 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center cursor-pointer shadow">
                    <span className="text-lg">📷</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                      disabled={uploadingAvatar}
                    />
                  </label>
                )}
                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left sm:pb-2">
                {isEditingProfile ? (
                  <>
                    <input
                      type="text"
                      name="displayName"
                      value={editFormData.displayName}
                      onChange={handleEditChange}
                      className="text-2xl font-bold bg-white border border-gray-300 rounded px-2 py-1 w-full max-w-xs"
                      placeholder="Tên hiển thị"
                    />
                    <textarea
                      name="bio"
                      value={editFormData.bio}
                      onChange={handleEditChange}
                      className="text-gray-600 mt-2 bg-white border border-gray-300 rounded px-2 py-1 w-full max-w-md text-sm"
                      placeholder="Tiểu sử..."
                      rows={2}
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{profile.displayName}</h1>
                    <p className="text-[#1877f2] font-medium">{profile.friendStatus}</p>
                    {profile.bio && <p className="text-gray-600 mt-1">{profile.bio}</p>}
                  </>
                )}
              </div>

              <div className="flex gap-2 pb-2">
                {profile.friendStatus === "Chưa kết bạn" && profile.iviteStatus === "Chưa gửi lời mời" && (
                  <Button variant="destructive" onClick={() => handleSendFriendRequest(profile.id)}>
                    <UserPlus className="w-4 h-4" /> Gửi lời mời kết bạn
                  </Button>
                )}
                {profile.friendStatus === "Bạn bè" && (
                  <Button variant="destructive" onClick={() => handleUnfriend(profile.id)}>
                    <UserMinus className="w-4 h-4" /> Hủy kết bạn
                  </Button>
                )}
                {profile.friendStatus === "Chính bạn" && !isEditingProfile && (
                  <Button onClick={startEditProfile} className="bg-gray-200 hover:bg-gray-300 text-black">
                    Chỉnh sửa trang cá nhân
                  </Button>
                )}
                {profile.friendStatus === "Chính bạn" && isEditingProfile && (
                  <>
                    <Button onClick={handleSaveProfile} className="bg-[#1877f2] hover:bg-[#166fe5] text-white">
                      Lưu
                    </Button>
                    <Button onClick={handleCancelEdit} className="bg-gray-200 hover:bg-gray-300 text-black">
                      Hủy
                    </Button>
                  </>
                )}
                {profile.iviteStatus === "Đã gửi lời mời" && profile.friendStatus === "Chưa kết bạn" && (
                  <Button variant="destructive" onClick={() => handleCancelFriendRequest(profile.id)}>
                    <UserPlus className="w-4 h-4" /> Hủy lời mời
                  </Button>
                )}
                {profile.friendStatus !== "Chính bạn" && (
                  <Button
                    variant="destructive"
                    onClick={() => handleSendMessage(profile.id)}
                  >
                    <MessageSquare className="w-4 h-4" /> Nhắn tin
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-2 border-t pt-1">
              <button className="px-4 py-4 text-[#1877f2] font-semibold border-b-[3px] border-[#1877f2]" onClick={() => navigate(`/myPage/${profile.id}`)}>Bài viết</button>
              <button className="px-4 py-4 text-[#1877f2] font-semibold border-b-[3px] border-[#1877f2]" onClick={() => navigate(`/friendlist`)}>Bạn bè</button>
              <button className="px-4 py-4 text-[#1877f2] font-semibold border-b-[3px] border-[#1877f2]" onClick={() => navigate(`/allImage/${profile.id}`)}>Ảnh</button>
              <button className="px-4 py-4 text-[#1877f2] font-semibold border-b-[3px] border-[#1877f2]" onClick={() => navigate(`/allVideo/${profile.id}`)}>Video</button>
            </div>
          </div>
        </div>
      )}

      {/* 2-Column Layout: Left Info + Right Posts */}
      <div className="max-w-[1300px] mx-auto pt-4 px-4">
        <div className="flex gap-4">

          {/* LEFT COLUMN - Sticky Info */}
          <div className="w-[400px] flex-shrink-0 hidden lg:block">
            <div className="sticky top-[70px] space-y-4">

              {/* Thông tin cá nhân*/}
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-xl font-bold mb-3">Giới thiệu</h2>

                {profile?.displayName && (
                  <p className="text-center text-gray-600 mb-3 font-medium">{profile.displayName}</p>
                )}

                <div className="mt-4 space-y-3">
                  {/* Bio */}
                  <div className="flex items-start gap-2 text-gray-600">
                    <span>Tiểu sử :</span>
                    {isEditingProfile ? (
                      <textarea
                        name="bio"
                        value={editFormData.bio}
                        onChange={handleEditChange}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Tiểu sử..."
                        rows={2}
                      />
                    ) : (
                      <span>{profile.bio || "Chưa có tiểu sử"}</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>Email :</span>
                    {isEditingProfile ? (
                      <input
                        type="email"
                        name="email"
                        value={editFormData.email}
                        onChange={handleEditChange}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Email..."
                      />
                    ) : (
                      <span>{profile.email || "Chưa có email"}</span>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>Số điện thoại :</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        name="phone"
                        value={editFormData.phone}
                        onChange={handleEditChange}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        placeholder="Số điện thoại..."
                      />
                    ) : (
                      <span>{profile.phone || "Chưa có số điện thoại"}</span>
                    )}
                  </div>

                  {/* Ngày tham gia */}
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>Tham gia {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' }) : 'Facebook'}</span>
                  </div>
                </div>

                {/* Nút chỉnh sửa ở cột trái */}
                {profile.friendStatus === "Chính bạn" && !isEditingProfile && (
                  <button
                    onClick={startEditProfile}
                    className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm"
                  >
                    Chỉnh sửa chi tiết
                  </button>
                )}

                {profile.friendStatus === "Chính bạn" && isEditingProfile && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg font-semibold text-sm"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>

              {/* Ảnh */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold">Ảnh</h2>
                  <button
                    className="text-gray-500 font-semibold hover:bg-blue-100 rounded-lg"
                    onClick={() => navigate(`/allImage/${profile.id}`)}>
                    Xem tất cả
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 rounded-lg overflow-hidden">
                  {media.map((m, idx) => (
                    <img key={idx} src={m.url} className="w-full object-cover" style={{ maxHeight: "400px" }} />
                  ))}
                </div>
              </div>

              {/* Bạn bè */}
              {friends.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">Bạn bè</h2>
                    <button
                      className="text-gray-500 font-semibold hover:bg-blue-100 rounded-lg"
                      onClick={() => navigate(`/friendlist`)}>
                      Xem tất cả
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {
                      friends.map((friend) => {
                        return (
                          <div key={friend.id} className="text-center">
                            <img src={friend.avatar || defaultImage} className="w-full object-cover" style={{ maxHeight: "400px" }} />
                            <p className="text-xs font-medium truncate">{friend.username}</p>
                          </div>
                        )
                      })
                    }
                  </div>
                </div>
              )}

              {/* Bạn chung */}
              {commonFriends && commonFriends.length > 0 && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold">Bạn chung</h2>
                    <button
                      className="text-gray-500 font-semibold hover:bg-blue-100 rounded-lg"
                      onClick={() => navigate(`/friends/list/${profile.id}`)}
                    >
                      Xem tất cả
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {
                      commonFriends && commonFriends.map((user) => {
                        return (
                          <div key={user.id} className="text-center">
                            <img src={user.avatar || defaultImage} className="w-full object-cover" style={{ maxHeight: "400px" }} />
                            <p className="text-xs font-medium truncate">{user.username}</p>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* RIGHT COLUMN - Posts */}
          <div className="flex-1 min-w-0">
            {posts.length === 0 && !loading && (
              <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">Chưa có bài viết nào</div>
            )}

            {posts.map((post) => (
              <div key={post.id} className="bg-white rounded-lg shadow mb-4">
                {/* Header */}
                <div className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/myPage/${post.user?.id}`)}>
                    <img src={post.user?.avatar || "/default-avatar.png"} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <p className="font-semibold text-[15px] hover:underline">{post.user?.displayName}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button onClick={() => setOpenMenuPostId(openMenuPostId === post.id ? null : post.id)} className="p-2 hover:bg-gray-100 rounded-full">
                      <MoreHorizontal className="w-5 h-5 text-gray-500" />
                    </button>
                    {openMenuPostId === post.id && (
                      <div className="absolute right-0 mt-1 bg-white border rounded-lg shadow-lg z-20 w-48">
                        <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={() => { setOpenMenuPostId(null); navigate(`/edit/${post.id}`); }}>✏️ Chỉnh sửa</button>
                        <button className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100" onClick={() => handleDelete(post.id)}>🗑️ Xóa bài viết</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="px-3 pb-2">
                  <p className="text-[15px] whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Media */}
                {post.media && post.media.length > 0 && (
                  <div className={post.media.length > 1 ? "grid grid-cols-2 gap-0.5" : ""}>
                    {post.media.map((file, idx) => file.type === "image" ? (
                      <img key={idx} src={file.url} className="w-full object-cover" style={{ maxHeight: "400px" }} />
                    ) : (
                      <video key={idx} src={file.url} className="w-full" controls />
                    ))}
                  </div>
                )}

                {/*Trạng thái số lượng */}
                <div className="px-3 py-2 flex justify-between text-sm text-gray-500 border-b">
                  <span>{post.reactionsTotal > 0 && `👍 ${post.reactionsTotal}`}</span>
                  <div className="flex gap-3">
                    <span>{post.commentsCount > 0 && `${post.commentsCount} bình luận`}</span>
                    <span>{post.shares > 0 && `${post.shares} chia sẻ`}</span>
                  </div>
                </div>

                {/* Hành động bày tỏ cảm xúc */}
                <div className="flex border-b">
                  <div className="flex-1 relative" onMouseEnter={() => setShowPicker(post.id)} onMouseLeave={() => setShowPicker(null)}>
                    <button onClick={() => handleReaction(post.id, "like")} className={`w-full py-2 flex items-center justify-center gap-1 hover:bg-gray-100 ${post.myReaction ? "text-[#1877f2]" : "text-gray-600"}`}>
                      <ThumbsUp className="w-5 h-5" /> Thích
                    </button>
                    {showPicker === post.id && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex bg-white shadow-lg rounded-full px-2 py-1 z-10">
                        {reactions.map((r) => (
                          <button key={r.type} onClick={() => handleReaction(post.id, r.type)} className="text-2xl px-1 hover:scale-125 transition-transform">{r.icon}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setActiveCommentBox(activeCommentBox === post.id ? null : post.id)} className="flex-1 py-2 flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-100">
                    <MessageCircle className="w-5 h-5" /> Bình luận
                  </button>
                  <button className="flex-1 py-2 flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-100">
                    <Share2 className="w-5 h-5" /> Chia sẻ
                  </button>
                </div>

                {/* Comments */}
                {activeCommentBox === post.id && (
                  <div className="p-3">
                    <div className="flex gap-2 mb-3">
                      <input type="text" placeholder="Viết bình luận..." className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2 text-sm" value={commentInput[post.id] || ""} onChange={(e) => {
                        const cursorPos = e.target.selectionStart;
                        handleCommentInputChange(post.id, e.target.value, cursorPos);
                      }}
                        onKeyDown={(e) => handleCommentKeyDown(e, post.id, () => handleComment(post.id))} />
                      {emojiText[post.id] && (
                        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                          {emojiText[post.id].emoji}
                        </div>
                      )}
                      <button onClick={() => handleComment(post.id)} className="text-[#1877f2]"><Send className="w-5 h-5" /></button>
                    </div>
                    {post.comments && post.comments.length > 0 && renderCommentTree(post.comments, post.id)}
                  </div>
                )}
              </div>
            ))}

            {loading && <div className="text-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-4 border-[#1877f2] border-t-transparent mx-auto"></div></div>}
            {!hasMore && posts.length > 0 && <p className="text-center text-gray-500 py-4 text-sm">Đã xem hết bài viết</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

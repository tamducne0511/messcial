import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, Send, Globe, ArrowLeft } from "lucide-react";
import Navbar from "@/components/navbar";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import defaultImage from "../assets/images.jpeg"
import { io } from "socket.io-client";

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

export default function MyPost() {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [commentInput, setCommentInput] = useState({});
  const [showPicker, setShowPicker] = useState(null);
  const [activeReplyBox, setActiveReplyBox] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [openComment, setOpenComment] = useState(null);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [emojiText, setEmojiText] = useState({});
  const [activeCommentBox, setActiveCommentBox] = useState(null); // State để đóng/mở comment
  const { id } = useParams();
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  //lấy userId từ token
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPostId, setCurrentPostId] = useState(null);
  //connect socket
  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;
    //lấy userId từ token
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
      }
      catch (error) {
        console.error("Lỗi khi lấy thông tin user:", error);
      }
    }
    fetchUserInfo();
  }, []);
  //join room comment
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_comments', currentPostId);
    console.log("joined comments", currentPostId);
    return () => {
      socket.emit('leave_comments', currentPostId);
      console.log("left comments", currentPostId);
    }
  }, [socket, currentPostId]);
  //bắt sự kiện
  useEffect(() => {
    if (!socket) return;
    socket.on('new_comment', (data) => {
      const { comment, postId } = data;
      if (!comment || !postId) return;
      // Cập nhật post hiện tại
      if (post && post.id === postId) {
        const commentExists = post.comments?.some(c => c.id === comment.id);
        if (!commentExists) {
          setPost({
            ...post,
            comments: [...(post.comments || []), comment].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            commentsCount: (post.commentsCount || 0) + 1
          });
        }
      }
    })
    socket.on('comment_deleted', (data) => {
      const { commentId, postId } = data;
      if (!commentId || !postId) return;
      if (post && post.id === postId) {
        setPost({
          ...post,
          comments: post.comments.filter(c => c.id !== commentId),
          commentsCount: (post.commentsCount || 0) - 1,
        });
      }
    })
    socket.on('comment_updated', (data) => {
      const { comment, postId } = data;
      if (!comment || !postId) return;
      if (post && post.id === postId) {
        setPost({
          ...post,
          comments: post.comments.map(c => c.id === comment.id ? comment : c),
        });
        //cập nhật input comment
        setCommentInput((prev) => ({
          ...prev,
          [`${postId}-comment-${comment.id}`]: comment.content,
        }));
        
      }
    })
    return () => {
      socket.off('new_comment');
      socket.off('comment_deleted');
      socket.off('comment_updated');
    }
  }, [socket]);

  useEffect(() => {
    fetchPost();
  }, [id]);

  const fetchPost = async () => {
    setCurrentPostId(id);
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5001/api/posts/details/${id}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setPost(res.data.post || null);
    } catch (err) {
      console.error("Lỗi khi lấy bài post:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (postId, type = "like") => {
    try {
      if (post.myReaction === type) {
        await axios.delete(`http://localhost:5001/api/reactions/post/${postId}`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      } else {
        await axios.post(`http://localhost:5001/api/reactions/post/${postId}`, { type }, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      }
      await fetchPost();
    } catch (err) {
      console.error("Lỗi khi thả cảm xúc:", err);
    }
  };
  const handleReactionComment = async (postId, commentId, type = "like") => {
    try {
      // Lấy thông tin post hiện tại từ state hoặc fetch
      const res = await axios.get(`http://localhost:5001/api/posts/details/${postId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res post details:", res.data);
      
      //tìm comment trong mảng comments của bài post
      const comment = res.data.post.comments.find((c) => c.id === commentId);
      
      // Kiểm tra comment có tồn tại không
      if (!comment) {
        console.error("Comment not found:", commentId);
        alert("Không tìm thấy bình luận");
        return;
      }
      
      //lấy reaction hiện tại của comment
      const curentReaction = comment.myReaction;
      
      //nếu reaction hiện tại bằng type thì xóa reaction, ngược lại thêm reaction
      if (curentReaction === type) {
        await axios.delete(`http://localhost:5001/api/reactions/comment/${commentId}`, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      } else {
        await axios.post(`http://localhost:5001/api/reactions/comment/${commentId}`, { type }, {
          headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
        });
      }
      await fetchPost();
    } catch (error) {
      console.error("Lỗi khi thả cảm xúc comment:", error);
      alert("Lỗi khi thả cảm xúc comment: " + (error.response?.data?.message || error.message));
    }
  }


  const handleComment = async (postId) => {
    const content = commentInput[postId];
    if (!content) return;
    try {
      await axios.post("http://localhost:5001/api/comments/create", { postId, content }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setCommentInput((prev) => ({ ...prev, [postId]: "" }));
      await fetchPost();
    } catch (err) {
      console.error("Lỗi khi gửi comment:", err);
    }
  };

  const handleReply = async (postId, parentId) => {
    setCurrentPostId(postId);
    const replyKey = `${postId}-reply-${parentId}`;
    const content = commentInput[replyKey];
    if (!content) return;
    try {
      await axios.post("http://localhost:5001/api/comments/create", { postId, content, parentId }, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      setCommentInput((prev) => ({ ...prev, [replyKey]: "" }));
      setActiveReplyBox(null);
      await fetchPost();
    } catch (err) {
      console.error("Lỗi khi gửi reply:", err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) {
      return;
    }
    try {
      const res = await axios.delete(`http://localhost:5001/api/posts/delete/${postId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      console.log("res delete post:", res.data);
      alert("Xóa thật không thể khôi phục được");
      navigate("/");
    } catch (err) {
      console.error("Lỗi khi xóa bài viết:", err);
      alert("Lỗi khi xóa bài viết");
    }
  };


  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) {
      return;
    }
    try {
      await axios.delete(`http://localhost:5001/api/comments/delete/${commentId}`, {
        headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
      });
      await fetchPost();
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
      await fetchPost();
    } catch (err) {
      console.error("Lỗi khi cập nhật comment:", err);
    }
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

  const renderCommentTree = (comments, postId, parentId = null, level = 0) => {
    return comments
      .filter((c) => c.parentId === parentId)
      .map((c) => (
        <div key={c.id} className={`${level > 0 ? "ml-10" : ""} mb-2`}>
          <div className="flex gap-2">
            <img src={c.user?.avatar || defaultImage}
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
                    onChange={(e) => {
                      const cursorPos = e.target.selectionStart;
                      handleCommentInputChange(`${postId}-reply-${c.id}`, e.target.value, cursorPos);
                    }}
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

  if (loading) {
    return (
      <div className="bg-[#f0f2f5] min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#1877f2] border-t-transparent"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="w-[1800px] bg-[#f0f2f5] min-h-screen">
        <Navbar />
        <div className="max-w-[900px] mx-auto pt-8 px-4 text-center">
          <p className="text-gray-500 mb-4">Không tìm thấy bài viết</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-[#1877f2] text-white rounded-lg">Về trang chủ</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[1800px] bg-[#f0f2f5] min-h-screen">
      <Navbar />
      <div className="max-w-[900px] mx-auto pt-4 px-4">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 mb-4 text-[#1877f2] font-medium hover:underline">
          <ArrowLeft className="w-5 h-5" /> Quay lại
        </button>

        {/* Post */}
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(`/myPage/${post.user?.id}`)}>
              <img src={post.user?.avatar || defaultImage} className="w-10 h-10 rounded-full object-cover" />
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
                <img key={idx} src={file.url} className="w-full object-cover" style={{ maxHeight: "500px" }} />
              ) : (
                <video key={idx} src={file.url} className="w-full" controls />
              ))}
            </div>
          )}

          {/* Stats */}
          <div className="px-3 py-2 flex justify-between text-sm text-gray-500 border-b">
            <span>{post.reactionsTotal > 0 && `👍 ${post.reactionsTotal}`}</span>
            <div className="flex gap-3">
              <span>{post.commentsCount > 0 && `${post.commentsCount} bình luận`}</span>
              <span>{post.shares > 0 && `${post.shares} chia sẻ`}</span>
            </div>
          </div>

          {/* Actions */}
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
            <button 
              onClick={() => {
                setActiveCommentBox(activeCommentBox === post.id ? null : post.id);
                setCurrentPostId(post.id);
              }}
              className="flex-1 py-2 flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-100"
            >
              <MessageCircle className="w-5 h-5" /> Bình luận
            </button>
            <button className="flex-1 py-2 flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-100">
              <Share2 className="w-5 h-5" /> Chia sẻ
            </button>
          </div>

          {/* Comments - Chỉ hiển thị khi activeCommentBox === post.id */}
          {activeCommentBox === post.id && (
            <div className="p-3">
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  placeholder="Viết bình luận..." 
                  className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2 text-sm" 
                  value={commentInput[post.id] || ""} 
                  onChange={(e) => {
                    const cursorPos = e.target.selectionStart;
                    handleCommentInputChange(post.id, e.target.value, cursorPos);
                  }} 
                  onKeyDown={(e) => handleCommentKeyDown(e, post.id, () => handleComment(post.id))} 
                />
                {emojiText[post.id] && (
                  <div className="absolute right-12 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                    {emojiText[post.id].emoji}
                  </div>
                )}
                <button onClick={() => handleComment(post.id)} className="text-[#1877f2]">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              {post.comments && post.comments.length > 0 && renderCommentTree(post.comments, post.id)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

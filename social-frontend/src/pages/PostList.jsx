import React, { useEffect, useState } from "react";
import { MoreHorizontal, ThumbsUp, MessageCircle, Share2, Send} from "lucide-react";
import Navbar from "@/components/navbar";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import defaultImage from "../assets/images.jpeg";
import { io } from "socket.io-client";
import CreatePost from "@/components/createPost";
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

export default function PostList() {
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
  const [socket, setSocket] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentPostId, setCurrentPostId] = useState(null);
  //thêm state đê hiển thị emoji trong text
  const [emojiText, setEmojiText] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  //fetch posts khi component mount
  useEffect(() => {
    fetchPosts(page, true);
  }, []);

  // Check URL params để mở modal
  useEffect(() => {
    if (searchParams.get("create") === "true") {
      setShowCreateModal(true);
      setSearchParams({}); // Xóa query param
    }
  }, [searchParams, setSearchParams]);
  //connect socket
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

  //join room comments
  useEffect(() => {
    if (!socket) return;
    socket.emit('join_comments', currentPostId);
    console.log("joined comments", currentPostId);
    return () => {
      socket.emit('leave_comments', currentPostId);
      console.log("left comments", currentPostId);
    }
  }, [socket, currentPostId]);

  //bắt sự kiện soket
  useEffect(() => {
    if (!socket) return;
    socket.on('new_comment', (data) => {
      const { comment, postId } = data;
      if (!comment || !postId) return;

      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const commentExists = post.comments?.some(c => c.id === comment.id);
          if (commentExists) return post;

          return {
            ...post,
            comments: [...(post.comments || []), comment].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
            commentsCount: (post.commentsCount || 0) + 1
          };
        }
        return post;
      }));
    })
    socket.on('comment_deleted', (data) => {
      const { commentId, postId } = data;
      if (!commentId || !postId) return;
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(c => c.id !== commentId),
            commentsCount: (post.commentsCount || 0) - 1,
          }
        }
        return post;
      }));
    })
    socket.on('comment_updated', (data) => {
      const { comment, postId } = data;
      if (!comment || !postId) return;
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map(c => c.id === comment.id ? comment : c),
          }
        }
        return post;
      }));
      setCommentInput((prev) => ({
        ...prev,
        [`${postId}-comment-${comment.id}`]: comment.content,
      }));
    })
    return () => {
      socket.off('new_comment');
      socket.off('comment_deleted');
    }
  }, [socket]);

  const fetchPosts = async (pageNum = 1, replace = false) => {
    try {
      setLoading(true);
      const res = await axios.get(`http://localhost:5001/api/posts/list?page=${pageNum}&limit=2`, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
      });
      const newPosts = res.data.posts || [];
      console.log("newPosts", newPosts);
      if (replace) {
        setPosts(newPosts || []);
      } else {
        setPosts((prev) => {
          //tạo set để lọc những giá trị trungf lặp ra vì set chỉ duy nhất 1 giá trị
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
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
    const handleScroll = () => {
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
      //tìm bài post trong mảng posts
      const post = posts.find((p) => p.id === postId);
      //lấy reaction hiện tại của bài post
      const currentReaction = post.myReaction;
      //nếu reaction hiện tại bằng type thì xóa reaction, ngược lại thêm reaction
      if (currentReaction === type) {
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

  const handleReactionComment = async (postId, commentId, type = "like") => {
    try {
      //tìm comment trong mảng comments của bài post
      const comment = posts.find((p) => p.id === postId).comments.find((c) => c.id === commentId);
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
      await fetchPosts(page, false);
    } catch (error) {
      console.error("Lỗi khi thả cảm xúc comment:", error);
      return res.status(500).json({ message: "Lỗi hệ thống" });
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
      await fetchPosts(page, false);
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
      await fetchPosts(page, true);
    } catch (err) {
      console.error("Lỗi khi cập nhật comment:", err);
    }
  };

  //tìm vị trí shortcut trong text
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
  //cập nhật comment input
  const handleUpdateCommentInputChange = (value, cursor) => {
    const found = replaceShortcuts(value, cursor);
    if (found) {
      setEditContent(found.newText);
    } else {
      setEditContent(value);
    }
  }
  //cập nhật comment keydown
  const handleUpdateCommentKeyDown = (e, postId, callback) => {
    const value = editContent;
    const cursor = e.target.selectionStart;
    if (e.key === " " || e.key === "Enter") {
      const found = replaceShortcuts(value, cursor);
      if (found) {
        setEditContent(found.newText);
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
  }
  

  //Đoạn này đang chưa hoàn thiện
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
                      onChange={(e) => {
                        setEditContent(e.target.value)
                        const cursorPos = e.target.selectionStart;
                        handleUpdateCommentInputChange(e.target.value, cursorPos);
                      }}
                      onKeyDown={(e) => handleUpdateCommentKeyDown(e, postId, () => handleUpdateComment(c.id))}
                      className="w-full border rounded px-2 py-1 text-sm truncate"
                      autoFocus
                    />
                    {emojiText[postId] && (
                      <div className="absolute right-12 top-1/2 -translate-y-1/2 text-lg pointer-events-none">
                        {emojiText[postId].emoji}
                      </div>
                    )}
                    <div className="flex gap-2 mt-1 inline-block">
                      <button onClick={() => handleUpdateComment(c.id)} className="text-xs text-[#1877f2] font-semibold">Lưu</button>
                      <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500">Hủy</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm">{c.content}</p>
                )}
              </div>
              <div className="flex gap-4 mt-1 ml-2 text-xs text-gray-500 relative" onMouseEnter={() => setShowPicker(c.id)} onMouseLeave={() => setShowPicker(null)}>
                <button className="font-semibold hover:underline" onClick={() => handleReactionComment(postId, c.id, "like")}>Thích</button>
                {showPicker === c.id && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 flex bg-white shadow-lg rounded-full px-2 py-1 z-10">
                    {reactions.map((r) => (
                      <button key={r.type} onClick={() => handleReactionComment(postId, c.id, r.type)} className="text-2xl px-1 hover:scale-125 transition-transform">{r.icon}</button>
                    ))}
                  </div>
                )}
                <button className="font-semibold hover:underline" onClick={() => setActiveReplyBox(activeReplyBox === c.id ? null : c.id)}>Phản hồi</button>
                <button onClick={() => setOpenComment(openComment === c.id ? null : c.id)} className="hover:underline">•••</button>

              </div>
              {openComment === c.id && (
                <div className="absolute mt-1 bg-white border rounded-lg shadow-lg z-20 w-36">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
                    onClick={() => {
                      setOpenComment(null);
                      setEditingCommentId(c.id);
                      setEditContent(c.content);
                    }}>
                    Chỉnh sửa
                  </button>
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
    //muốn ui toàn màn hình
    <div className="w-[1800px] bg-[#f0f2f5] min-h-screen">
      <Navbar />
      <div className="max-w-[900px] mx-auto pt-4 px-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white rounded-lg shadow mb-4">
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
                  <img key={idx} src={file.url} className="w-full object-cover" style={{ maxHeight: "400px" }} />
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
              <button onClick={() => {
                setActiveCommentBox(activeCommentBox === post.id ? null : post.id);
                setCurrentPostId(post.id);
              }
              } className="flex-1 py-2 flex items-center justify-center gap-1 text-gray-600 hover:bg-gray-100">
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
                  <input type="text" placeholder="Viết bình luận..."
                    className="flex-1 bg-[#f0f2f5] rounded-full px-4 py-2 text-sm"
                    value={commentInput[post.id] || ""}
                    onChange={(e) => {
                      const cursorPos = e.target.selectionStart;
                      handleCommentInputChange(post.id, e.target.value, cursorPos);
                    }}
                    onKeyDown={(e) => handleCommentKeyDown(e, post.id, handleComment)} />
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

      {/* Create Post Modal */}
      <CreatePost
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          // Refresh posts sau khi tạo bài viết thành công
          fetchPosts(1, true);
        }}
      />
    </div>
  );
}

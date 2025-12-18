import React, { useState, useEffect } from 'react'
import Navbar from './navbar'
import axios from 'axios'
import { useLocation, useNavigate} from 'react-router-dom';
import defaultImage from "../assets/images.jpeg"

const ListSearch = () => {
    const [activeTab, setActiveTab] = useState("users"); // "users" hoặc "posts"
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    //paging cho users
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [userPage, setUserPage] = useState(1);
    const [loadingUsers, setLoadingUsers] = useState(false);
    //paging cho posts
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [postPage, setPostPage] = useState(1);
    const [loadingPosts, setLoadingPosts] = useState(false);
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const searchTermFromUrl = query.get("search") || "";
    const navigate = useNavigate();
    useEffect(() => {
        setSearchTerm(searchTermFromUrl);
    }, [searchTermFromUrl]);

    const fetchUsers = async (pageNum = 1, replace = false) => {
        setLoadingUsers(true);
        try {
            const encodedSearch = encodeURIComponent(searchTerm || '');
            const res = await axios.get(`http://localhost:5001/api/invite/allusers?page=${pageNum}&search=${encodedSearch}`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            console.log("res:", res.data.users);
            const newUsers = res.data.users.rows || [];

            if (replace) {
                setUsers(newUsers);
                setFilteredUsers(newUsers);
            } else {
                setUsers((prev) => {
                    const existingIds = new Set(prev.map(u => u.id));
                    const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.id));
                    return [...prev, ...uniqueNewUsers];
                });
                setFilteredUsers((prev) => {
                    const existingIds = new Set(prev.map(u => u.id));
                    const uniqueNewUsers = newUsers.filter(u => !existingIds.has(u.id));
                    return [...prev, ...uniqueNewUsers];
                });
            }
            setHasMoreUsers(pageNum < res.data.users.totalPages);
        } catch (err) {
            console.error("Lỗi lấy user:", err);
        } finally {
            setLoadingUsers(false);
        }
    }

    const fetchPosts = async (pageNum = 1, replace = false) => {
        setLoadingPosts(true);
        try {
            // Encode searchTerm để tránh lỗi với ký tự đặc biệt
            const encodedSearch = encodeURIComponent(searchTerm || '');
            const res = await axios.get(`http://localhost:5001/api/posts/all?page=${pageNum}&search=${encodedSearch}`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            const newPosts = res.data.posts || [];
            console.log("newPosts:", newPosts);
            if (replace) {
                setPosts(newPosts);
                setFilteredPosts(newPosts);
            } else {
                setPosts((prev) => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
                setFilteredPosts((prev) => {
                    const existingIds = new Set(prev.map(p => p.id));
                    const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...uniqueNewPosts];
                });
            }
            setHasMorePosts(pageNum < res.data.totalPages);
        } catch (err) {
            console.error("Lỗi lấy posts:", err);
        } finally {
            setLoadingPosts(false);
        }
    }
    const handleDropdownScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const nearBottom = scrollTop + clientHeight >= scrollHeight;
        if (nearBottom && !loadingUsers && hasMoreUsers && activeTab === "users") {
            const nextPage = userPage + 1;
            setUserPage(nextPage);
            fetchUsers(nextPage, false);
        }
        if (nearBottom && !loadingPosts && hasMorePosts && activeTab === "posts") {
            const nextPage = postPage + 1;
            setPostPage(nextPage);
            fetchPosts(nextPage, false);
        }
    }
    useEffect(() => {
        // Reset về trang 1 khi search thay đổi
        setUserPage(1);
        setPostPage(1);
        fetchUsers(1, true);
        fetchPosts(1, true);
    }, [searchTerm]);


    const handleSendFriendRequest = async (friendId) => {
        try {
            await axios.post(`http://localhost:5001/api/invite/friends/request`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            alert("Gửi lời mời kết bạn thành công");
            fetchUsers(userPage, true);
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleAcceptFriendRequest = async (friendId) => {
        try {
            await axios.post(`http://localhost:5001/api/invite/friends/accept`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            alert("Đã chấp nhận lời mời kết bạn");
            fetchUsers(userPage, true);
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleCancelFriendRequest = async (friendId) => {
        try {
            await axios.post(`http://localhost:5001/api/invite/friends/cancel`, { friendId }, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            alert("Đã hủy lời mời kết bạn");
            fetchUsers(userPage, true);
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    const handleUnfriend = async (friendId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy kết bạn?")) {
            return;
        }
        try {
            await axios.delete(`http://localhost:5001/api/invite/friends/unfriend/${friendId}`, {
                headers: { Authorization: "Bearer " + localStorage.getItem("accessToken") },
            });
            alert("Đã hủy kết bạn");
            fetchUsers(userPage, true);
        } catch (error) {
            console.error(error);
            alert("Lỗi: " + (error.response?.data?.message || error.message));
        }
    };

    return (
        <>
            <Navbar />
            <div className="w-full bg-gray-100 min-h-screen">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                {/* Tabs */}
                                <div className="flex border-b border-gray-200 bg-white px-4">
                                    <button
                                        className={`px-4 py-3 text-sm font-semibold transition-colors relative ${activeTab === "users"
                                            ? "text-[#1877F2] border-b-2 border-[#1877F2]"
                                            : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        onClick={() => setActiveTab("users")}
                                    >
                                        Mọi người
                                    </button>
                                    <button
                                        className={`px-4 py-3 text-sm font-semibold transition-colors relative ${activeTab === "posts"
                                            ? "text-[#1877F2] border-b-2 border-[#1877F2]"
                                            : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        onClick={() => setActiveTab("posts")}
                                    >
                                        Bài viết
                                    </button>
                                </div>

                                {/* Content Area */}
                                <div className="p-4 max-h-[600px] overflow-y-auto" onScroll={handleDropdownScroll}>
                                    {/* TAB USERS - Mọi người */}
                                    {activeTab === "users" && (
                                        <div className="space-y-0">
                                            {loadingUsers && filteredUsers.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">Đang tải...</div>
                                            )}
                                            {!loadingUsers && filteredUsers.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">Không tìm thấy người dùng nào</div>
                                            )}
                                            {filteredUsers.map((user) => {
                                                return (
                                                    <div key={user.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                                    onClick={() => navigate(`/myPage/${user.id}`)}
                                                    style={{ cursor: "pointer" }}>
                                                        <img
                                                            src={user.avatar || defaultImage}
                                                            className="w-12 h-12 rounded-full object-cover"
                                                            alt={user.username}
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-semibold text-gray-900 text-sm">
                                                                {user.displayName || user.username}
                                                            </div>
                                                            {user.bio && (
                                                                <div className="text-xs text-gray-500 mt-0.5">
                                                                    {user.bio}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {user.friendStatus === "Bạn bè" && (
                                                                <button
                                                                    onClick={() => handleUnfriend(user.id)}
                                                                    className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                                                                >
                                                                    Hủy kết bạn
                                                                </button>
                                                            )}
                                                            {user.inviteStatus === "Đã gửi lời mời" && user.friendStatus === "Chưa kết bạn" && (
                                                                <button
                                                                    onClick={() => handleCancelFriendRequest(user.id)}
                                                                    className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                                                                >
                                                                    Hủy lời mời
                                                                </button>
                                                            )}
                                                            {user.inviteStatus === "Đã nhận lời mời" && user.friendStatus === "Chưa kết bạn" && (
                                                                <button
                                                                    onClick={() => handleAcceptFriendRequest(user.id)}
                                                                    className="px-4 py-1.5 bg-[#1877F2] text-primary text-sm font-semibold rounded-lg hover:bg-[#166FE5] transition-colors"
                                                                >
                                                                    Chấp nhận
                                                                </button>
                                                            )}
                                                            {user.inviteStatus === "Chưa gửi lời mời" && user.friendStatus === "Chưa kết bạn" && (
                                                                <button
                                                                    onClick={() => handleSendFriendRequest(user.id)}
                                                                    className="px-4 py-1.5 bg-[#1877F2] text-primary text-sm font-semibold rounded-lg hover:bg-[#166FE5] transition-colors"
                                                                >
                                                                    Thêm bạn bè
                                                                </button>
                                                            )}
                                                            <button className="px-4 py-1.5 bg-[#1877F2] text-primary text-sm font-semibold rounded-lg hover:bg-[#166FE5] transition-colors">
                                                                Nhắn tin
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {loadingUsers && filteredUsers.length > 0 && (
                                                <div className="text-center py-4 text-gray-500">Đang tải thêm...</div>
                                            )}
                                        </div>
                                    )}

                                    {/* TAB POSTS - Bài viết */}
                                    {activeTab === "posts" && (
                                        <div className="space-y-4">
                                            {loadingPosts && filteredPosts.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">Đang tải...</div>
                                            )}
                                            {!loadingPosts && filteredPosts.length === 0 && (
                                                <div className="text-center py-8 text-gray-500">Không tìm thấy bài viết nào</div>
                                            )}
                                            {filteredPosts.map((post) => (
                                                <div key={post.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow bg-white"
                                                onClick={() => navigate(`/myPost/${post.id}`)}
                                                style={{ cursor: "pointer" }}>
                                                    {/* Post Header */}
                                                    <div className="flex items-center gap-3 p-3">
                                                        <img
                                                            src={post.user?.avatar || defaultImage}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            alt={post.user?.displayName}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-semibold text-gray-900 text-sm">
                                                                {post.user?.displayName || "Người dùng"}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {new Date(post.createdAt).toLocaleDateString('vi-VN', {
                                                                    day: 'numeric',
                                                                    month: 'numeric',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Post Content */}
                                                    <div className="px-3 pb-3">
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                                            {post.content}
                                                        </p>
                                                    </div>

                                                    {/* Post Media */}
                                                    {post.media && post.media.length > 0 && (
                                                        <div className="w-full">
                                                            {post.media[0].type === "image" ? (
                                                                <img
                                                                    src={post.media[0].url}
                                                                    className="w-full object-cover"
                                                                    style={{ maxHeight: "400px" }}
                                                                    alt="Post media"
                                                                />
                                                            ) : (
                                                                <video
                                                                    src={post.media[0].url}
                                                                    className="w-full"
                                                                    controls
                                                                    style={{ maxHeight: "400px" }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Post Actions */}
                                                    <div className="px-3 py-2 border-t border-gray-200 flex items-center gap-4 text-gray-600">
                                                        <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">

                                                            <span className="text-sm">
                                                                {post.reactionsTotal > 0 ? `${post.reactionsTotal} Thích` : "Thích"}
                                                            </span>
                                                        </button>
                                                        <button className="flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors">

                                                            <span className="text-sm">
                                                                {post.commentsCount > 0 ? `${post.commentsCount} Bình luận` : "Bình luận"}
                                                            </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {loadingPosts && filteredPosts.length > 0 && (
                                                <div className="text-center py-4 text-gray-500">Đang tải thêm...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>

    )
}

export default ListSearch
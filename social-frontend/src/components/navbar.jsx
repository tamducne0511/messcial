import React from 'react'
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { MessageCircle } from 'lucide-react'
import { io } from 'socket.io-client'
import defaultImage from "../assets/images.jpeg"
const Navbar = () => {
    const [user, setUser] = useState(null)
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showList, setShowList] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("users"); // tab search
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    // Pagin cho users
    const [hasMoreUsers, setHasMoreUsers] = useState(true);
    const [userPage, setUserPage] = useState(1);
    const [loadingUsers, setLoadingUsers] = useState(false);
    // Pagin posts
    const [hasMorePosts, setHasMorePosts] = useState(true);
    const [postPage, setPostPage] = useState(1);
    const [loadingPosts, setLoadingPosts] = useState(false);
    

    const navigate = useNavigate()
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await axios.get("http://localhost:5001/api/user/me", {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                });
                setUser(res.data.user);

            } catch (error) {
                console.error("Lỗi khi lấy profile:", error);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const handleDocClick = () => setMenuOpen(false);
        const handleKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
        document.addEventListener('click', handleDocClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('click', handleDocClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, []);

    const handleSignout = async () => {
        try {
            // gọi API đăng xuất (xóa refresh token cookie ở server)
            await axios.post("http://localhost:5001/api/auth/signout", {}, {
                withCredentials: true,
            });
            // xóa access token trên FE
            localStorage.removeItem("accessToken");
            // điều hướng về login
            navigate("/login");
        } catch (error) {
            console.error("Lỗi khi đăng xuất:", error);
            // Hiện thông báo đơn giản
            alert("Đăng xuất không thành công");
        }
    }
    // Lấy danh sách user khi focus vào ô tìm kiếm, false khi scroll thêm trang thêm user mới vào danh sách
    //còn true dungfg khi muốn load lại danh sách từ đầu- xóa danh sách cũ thay bằng danh sách mới
    const fetchUsers = async (pageNum = 1, replace = false) => {
        if (loadingUsers) return;
        setLoadingUsers(true);
        try {
            const res = await axios.get(`http://localhost:5001/api/invite/allusers?page=${pageNum}&limit=2`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            console.log("res:", res.data.users);
            const newUsers = res.data.users.rows || [];
            console.log("newUsers:", newUsers);
            const inviteStatus = res.data.users.inviteStatus;
            console.log("inviteStatus:", inviteStatus);
            if (replace) {
                setUsers(newUsers);
                setFilteredUsers(newUsers);
            } else {
                // Loại bỏ duplicate
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
    };

    // Handle scroll trong dropdown để load thêm
    const handleDropdownScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const nearBottom = scrollTop + clientHeight >= scrollHeight;

        // Load thêm users
        if (nearBottom && !loadingUsers && hasMoreUsers && activeTab === "users") {
            const nextPage = userPage + 1;
            setUserPage(nextPage);
            fetchUsers(nextPage, false);
        }

        // Load thêm posts
        if (nearBottom && !loadingPosts && hasMorePosts && activeTab === "posts") {
            const nextPage = postPage + 1;
            setPostPage(nextPage);
            fetchPosts(nextPage, false);
        }
    };

    // Lấy danh sách posts
    const fetchPosts = async (pageNum = 1, replace = false) => {
        if (loadingPosts) return;
        setLoadingPosts(true);
        try {
            const res = await axios.get(`http://localhost:5001/api/posts/all?page=${pageNum}&limit=2`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            const newPosts = res.data.posts || [];
            if (replace) {
                setPosts(newPosts);
                setFilteredPosts(newPosts);
            } else {
                // Loại bỏ duplicate
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
            console.error("Lỗi lấy bài viết:", err);
        } finally {
            setLoadingPosts(false);
        }
    };
    const handleChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        // lọc user
        const filteredU = users.filter((u) =>
            u.username.toLowerCase().includes(value.toLowerCase()) ||
            u.displayName?.toLowerCase().includes(value.toLowerCase()) ||
            u.email?.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredUsers(filteredU);

        // lọc post
        const filteredP = posts.filter((p) =>
            p.content.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredPosts(filteredP);
    };

    return (
        <nav className="w-[1800px] bg-white shadow-sm px-4 py-2 flex items-center justify-between sticky top-0 z-50">
            {/* LEFT: Logo + Search */}
            <div className="flex items-center gap-4">

                {/* Logo FB style */}
                <span className="text-2xl font-bold text-blue-600 cursor-pointer select-none">
                    <a href="/" >SocialApp</a>
                </span>

                {/* Search box */}
                <div className="relative">

                    <input
                        type="text"
                        placeholder="Tìm kiếm trên SocialApp..."
                        className="w-64 px-4 py-2 bg-gray-100 border border-gray-200 rounded-full text-sm 
        focus:bg-white focus:border-blue-400 focus:outline-none transition-all"
                        value={searchTerm}
                        onChange={handleChange}
                        onFocus={() => {
                            setShowList(true);
                            // Reset pages
                            setUserPage(1);
                            setPostPage(1);
                            fetchUsers(1, true);
                            fetchPosts(1, true);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // Encode searchTerm để tránh lỗi với ký tự đặc biệt
                                const encodedSearch = encodeURIComponent(searchTerm || '');
                                navigate(`/listsearch?search=${encodedSearch}`, {
                                    state: { searchTerm: searchTerm }
                                });
                                // Đóng dropdown nếu đang mở
                                setShowList(false);
                            }
                        }}
                    />
                </div>


                {/* Menu buttons similar to FB */}

            </div>
            <div className="flex items-center justify-start gap-4 mr-[350px]">
                <div className="flex gap-2 ml-4">
                    <Button variant="ghost" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100">
                        📝 <Link to="/?create=true">Tạo bài viết</Link>
                    </Button>
                    <Button variant="ghost" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100">
                        👥 <Link to="/friendlist">Bạn bè</Link>
                    </Button>
                    <Button variant="ghost" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100">
                        ⭐ <Link to="/friendgoiy">Gợi ý</Link>
                    </Button>
                </div>
            </div>

            {/* RIGHT: Avatar + Menu */}
            <div className="flex items-center gap-4 relative">
                <Button variant="ghost" className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 w-16 h-11" onClick={() => navigate("/messenger")}>
                    <MessageCircle className="w-6 h-6" />
                </Button>
                <NotificationBell  />

                {/* Avatar */}
                <div
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowList(false);
                        setMenuOpen(!menuOpen);
                    }}
                    className="cursor-pointer"
                >
                    <img
                        src={user?.avatar || defaultImage}
                        className="w-10 h-10 rounded-full border hover:ring-2 hover:ring-blue-300 transition"
                    />
                </div>

                {/* Dropdown menu */}
                {menuOpen && (
                    <div className="absolute right-0 mt-3 w-64 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
                        {/* Profile */}
                        <div className="p-3 border-b flex items-center gap-3 hover:bg-gray-50 cursor-pointer">
                            <img
                                src={user?.avatar || defaultImage}
                                className="w-11 h-11 rounded-full"
                            />
                            <div>
                                <div className="font-semibold text-gray-800">
                                    {user?.displayName || user?.username}
                                </div>
                                <div className="text-xs text-gray-500">{user?.email}</div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2">
                            <button
                                className="block w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg"
                                onClick={() => { setMenuOpen(false); navigate(`/myPage/${user?.id}`); }}
                            >
                                Xem trang cá nhân
                            </button>

                            <button
                                className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                onClick={() => { setMenuOpen(false); handleSignout(); }}
                            >
                                Đăng xuất
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </nav>

    )
}

export default Navbar
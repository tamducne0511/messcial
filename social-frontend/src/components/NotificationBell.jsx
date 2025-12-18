import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import defaultImage from "../assets/images.jpeg"
const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [socket, setSocket] = useState(null);
    const [currentUserId, setCurrentUserId] = useState(null);
    const dropdownRef = useRef(null);
    const [totalPages, setTotalPages] = useState(1);
    const navigate = useNavigate();
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
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
    //join room notifications
    useEffect(() => {
        if (!socket) return;
        socket.emit('join_notifications', currentUserId);
        console.log("joined notifications", currentUserId);
        return () => {
            socket.emit('leave_notifications', currentUserId);
            console.log("left notifications", currentUserId);
        }
    }, [currentUserId, socket]);

    //bắt sự kiện soket
    useEffect(() => {
        if (!socket) return;
        //nghe thông báo mới
        socket.on('new_notification', (data) => {
            console.log("new notification", data);
            setNotifications(prev => [...prev, data.notification]);
            setUnreadCount(prev => prev + 1);
            fetchNotifications();
            fetchUnreadCount();
        })
        //nghe số thông báo chưa đọc
        // socket.on('unread_count', (data) => {
        //     console.log("unread count", data);
        //     setUnreadCount(data.unreadCount);
        //     fetchNotifications();
        //     fetchUnreadCount();
        // })
        return () => {
            socket.off('new_notification');
            // socket.off('unread_count');
        }
    }, [socket]);
    //fetch thông báo khi component mount
    useEffect(() => {
        fetchNotifications();
        fetchUnreadCount();
    }, []);

    // Đóng dropdown khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch danh sách thông báo với pagination
    const fetchNotifications = async (pageNum = 1, replace = false) => {
        if (!hasMore) return;
        setLoading(true);
        try {
            const res = await axios.get(`http://localhost:5001/api/notifications/notifications?page=${pageNum}&limit=3`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            console.log(res.data.notifications);
            const newNotifications = res.data.notifications || [];
            console.log("newNotifications", newNotifications);
            if (replace) {
                setNotifications(newNotifications || []);
            } else {
                setNotifications(prev => {
                    const existingIds = new Set(prev.map(n => n.id));
                    const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
                    return [...prev, ...uniqueNewNotifications].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                });
            }
            setHasMore(pageNum < res.data.totalPages);
            setLoading(false);
        } catch (error) {
            console.error('Lỗi khi lấy thông báo:', error);
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    //1 button load more
    const handleLoadMore = () => {
        setPage(page + 1);
        fetchNotifications(page + 1, false);
    }

    // Fetch số thông báo chưa đọc
    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get('http://localhost:5001/api/notifications/notifications/count-unread', {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            setUnreadCount(res.data.unreadCount);
        } catch (error) {
            console.error('Lỗi khi đếm thông báo:', error);
        }
    };

    // Xử lý click vào thông báo
    const handleNotificationClick = async (notification) => {
        // Đánh dấu đã đọc
        if (!notification.isRead) {
            try {
                await axios.put(`http://localhost:5001/api/notifications/notifications/${notification.id}/read`, {}, {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                });
                // Cập nhật local state
                setNotifications(prev =>
                    prev.map(n =>
                        n.id === notification.id ? { ...n, isRead: true } : n
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
                fetchUnreadCount();
            } catch (error) {
                console.error('Lỗi khi đánh dấu đã đọc:', error);
            }
        }

        // Navigate đến nơi liên quan
        if (notification.type === 'friend_request') {
            navigate(`/myPage/${notification.senderId}`);
        } else if (notification.type === 'comment') {
            navigate(`/myPost/${notification.relatedId}`);
        } else if (notification.type === 'like') {
            navigate(`/myPost/${notification.relatedId}`);
        }else if (notification.type === 'post') {
            navigate(`/myPost/${notification.relatedId}`);
        }

        setShowDropdown(false);

    };

    // Format thời gian
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Vừa xong';
        if (minutes < 60) return `${minutes} phút trước`;
        if (hours < 24) return `${hours} giờ trước`;
        if (days < 7) return `${days} ngày trước`;
        return date.toLocaleDateString('vi-VN');
    };

    // Icon theo type
    const getTypeIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return '👥';
            case 'comment':
                return '💬';
            case 'like':
                return '👍';
            default:
                return '🔔';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Icon chuông */}
            <button
                onClick={() => {
                    setShowDropdown(!showDropdown);
                    if (!showDropdown) {
                        fetchNotifications();
                    }
                }}
                className="relative p-2 hover:bg-gray-100 rounded-full transition"
            >
                <Bell className="w-6 h-6 text-gray-700" />
                {/* Badge số thông báo chưa đọc */}
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown thông báo */}
            {showDropdown && (
                <div className="absolute right-0 mt-2 w-96 bg-white border rounded-lg shadow-xl z-50 max-h-[500px] overflow-hidden flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Thông báo</h3>
                        {unreadCount > 0 && (
                            <span className="text-sm text-blue-600">
                                {unreadCount} mới
                            </span>
                        )}
                    </div>

                    {/* Danh sách thông báo */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="p-4 text-center text-gray-500">
                                Đang tải...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-4 text-center text-gray-500">
                                Không có thông báo nào
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 border-b hover:bg-gray-50 cursor-pointer transition ${!notification.isRead ? 'bg-blue-50' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        {/* Avatar người gửi */}
                                        <img
                                            src={notification.sender?.avatar || defaultImage}
                                            alt={notification.sender?.displayName}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <div className="flex-1 min-w-0">
                                            {/* Icon type */}
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">
                                                    {getTypeIcon(notification.type)}
                                                </span>
                                                <p className="text-sm text-gray-800 line-clamp-2">
                                                    {notification.content}
                                                </p>
                                            </div>
                                            {/* Thời gian */}
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatTime(notification.createdAt)}
                                            </p>
                                        </div>
                                        {/* Load more button */}
                                        
                                        {/* Dot chưa đọc */}
                                        {!notification.isRead && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                    
                                </div>
                            ))
                        )}
                        {hasMore && (
                            <div className="text-center mt-2">
                                <button className="text-blue-500 hover:text-blue-700" onClick={handleLoadMore}>Xem thêm</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;


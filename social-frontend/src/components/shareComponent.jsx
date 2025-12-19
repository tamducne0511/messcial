import { useState, useEffect } from "react";
import axios from "axios";
import {
    Send,
    Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import defaultImage from "../assets/images.jpeg";
import { useSearchParams } from "react-router-dom";

export default function ShareComponent({ isOpen, onClose, onSuccess, postId: propPostId }) {
    const [user, setUser] = useState(null);
    const [post, setPost] = useState(null);
    const [selectedPostId, setSelectedPostId] = useState(null);
    const [shareMessage, setShareMessage] = useState("");
    const [searchParams] = useSearchParams();
    const [privacy, setPrivacy] = useState("public");

    const getPrivacyLabel = (value) => {
        switch (value) {
            case "public":
                return "Công khai";
            case "friends":
                return "Bạn bè";
            case "private":
                return "Chỉ mình tôi";
            default:
                return "Công khai";
        }
    };
    // Lấy thông tin user
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get("http://localhost:5001/api/user/me", {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                });
                setUser(res.data.user);
            } catch (error) {
                console.error("Lỗi khi lấy thông tin user:", error);
            }
        };
        if (isOpen) {
            fetchUser();
            // Lấy postId từ props hoặc URL params
            const postId = propPostId || searchParams.get("postId");
            console.log("postId:", postId);
            if (postId) {
                setSelectedPostId(postId);
                fetchPost(postId);
            }
        }
    }, [isOpen, searchParams, propPostId]);

    // Lấy thông tin post
    const fetchPost = async (postId) => {
        try {
            const res = await axios.get(`http://localhost:5001/api/posts/details/${postId}`, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("accessToken"),
                },
            });
            console.log("res post:", res.data.post);
            setPost(res.data.post);
        } catch (error) {
            console.error("Lỗi khi lấy thông tin post:", error);
        }
    };



    // Share to News Feed
    const handleShareToFeed = async () => {
        if (!selectedPostId) return;
        try {
            // Tạo bài viết mới với nội dung share
            const shareContent = shareMessage || `Đã chia sẻ một bài viết`;

            // Lấy thông tin post gốc để copy media nếu có
            let mediaToShare = [];
            if (post && post.media && post.media.length > 0) {
                mediaToShare = post.media.map(m => ({
                    url: m.url,
                    type: m.type
                }));
            }

            const res = await axios.post(
                "http://localhost:5001/api/posts/share",
                {
                    content: shareContent,
                    privacy: "public",
                    sharedPostId: selectedPostId,
                },
                {
                    headers: {
                        Authorization: "Bearer " + localStorage.getItem("accessToken"),
                    },
                }
            );
            console.log("res share:", res.data);
            alert("Đã chia sẻ bài viết!");
            handleClose();
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Lỗi khi chia sẻ:", error);
            alert("Lỗi khi chia sẻ bài viết: " + (error.response?.data?.message || error.message));
        }
    };



    const handleClose = () => {
        setShareMessage("");
        setPost(null);
        setSelectedPostId(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    handleClose();
                }
            }}
        >
            {/* Modal */}
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Chia sẻ bài viết</h2>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <span className="text-gray-600 text-2xl font-bold">X</span>
                    </button>
                </div>

                {/* User info */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <img
                            src={user?.avatar || defaultImage}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="flex-1">
                            <div className="font-semibold text-gray-900">
                                {user?.displayName || user?.username || "Người dùng"}
                            </div>
                        </div>
                        <Select onValueChange={setPrivacy} value={privacy}><SelectTrigger className="w-auto h-9 px-3 border-gray-300 rounded-lg hover:bg-gray-50">
                            <div className="flex items-center gap-1.5">
                                <Lock className="w-4 h-4 text-gray-600" />
                                <SelectValue>{getPrivacyLabel(privacy)}</SelectValue>
                            </div>
                        </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="public">Công khai</SelectItem>
                                <SelectItem value="friends">Bạn bè</SelectItem>
                                <SelectItem value="private">Chỉ mình tôi</SelectItem>
                            </SelectContent>
                        </Select>

                    </div>
                </div>


                {/* Post */}
                {post && (
                    <div className="p-4 border-b border-gray-200 bg-gray-50">
                        <div className="flex gap-3">
                            <img
                                src={post.user?.avatar || defaultImage}
                                alt="avatar"
                                className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                                <div className="font-semibold text-sm text-gray-900">
                                    {post.user?.displayName || post.user?.username}
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {post.content}
                                </p>
                                {post.media && post.media.length > 0 && (
                                    <div className="mt-2 rounded-lg overflow-hidden">
                                        {post.media[0].type === "image" ? (
                                            <img
                                                src={post.media[0].url}
                                                alt="post"
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        ) : (
                                            <video
                                                src={post.media[0].url}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Share message input */}
                <div className="p-4 border-b border-gray-200">
                    <textarea
                        placeholder="Viết gì đó..."
                        value={shareMessage}
                        onChange={(e) => setShareMessage(e.target.value)}
                        className="w-full border-0 resize-none text-base placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[80px]"
                        rows={3}
                    />
                </div>

                {/* Share options */}

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <Button
                        onClick={handleShareToFeed}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Chia sẻ
                    </Button>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Lock, Image, UserPlus, MoreHorizontal, Lightbulb } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import defaultImage from "../assets/images.jpeg";

export default function EditPost() {
  const { id } = useParams();
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [mediaFiles, setMediaFiles] = useState([]);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Fetch user info
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
    fetchUser();
  }, []);

  // Fetch post data
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await axios.get(`http://localhost:5001/api/posts/details/${id}`, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
          },
        });
        const post = res.data.post;
        console.log(post);
        setContent(post.content);
        setPrivacy(post.privacy);
        setMediaFiles(post.media || []);
      } catch (err) {
        console.error("Lỗi khi lấy bài viết:", err);
      }
    };
    fetchPost();
  }, [id]);

  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files);
    const uploaded = [];

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axios.post("http://localhost:5001/api/media/upload", formData, {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("accessToken"),
            "Content-Type": "multipart/form-data",
          },
        });

        console.log("Upload response:", res.data);

        // Lưu đầy đủ thông tin từ API response
        uploaded.push({
          url: res.data.url, // URL thật từ server: http://localhost:5001/upload/posts/...
          type: res.data.type || (file.type.startsWith("image") ? "image" : "video"),
          filename: res.data.filename
        });
      } catch (err) {
        console.error("Lỗi upload file:", err.response?.data || err.message);
        alert("Lỗi upload " + file.name + ": " + (err.response?.data?.message || err.message));
      }
    }

    setMediaFiles((prev) => [...prev, ...uploaded]);
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const postData = {
        content,
        privacy,
        media: mediaFiles,
      };

      const res = await axios.put(`http://localhost:5001/api/posts/update/${id}`, postData, {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
      });

      alert("Cập nhật bài viết thành công!");
      navigate("/");
      console.log("UPDATE RESPONSE:", res.data);
    } catch (error) {
      console.error("Error updating post:", error);
      alert("Lỗi cập nhật bài viết: " + (error.response?.data?.message || error.message));
    }
  };

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

  const handleFileInputClick = () => {
    document.getElementById("file-input").click();
  };

  const handleClose = () => {
    navigate("/");
  };

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
          <h2 className="text-xl font-bold text-gray-900">Chỉnh sửa bài viết</h2>
          <button
            onClick={handleClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-600 text-2xl font-bold">X</span>
          </button>
        </div>

        {/* Thông tin người dùng và quyền riêng tư*/}
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
            <Select onValueChange={setPrivacy} value={privacy}>
              <SelectTrigger className="w-auto h-9 px-3 border-gray-300 rounded-lg hover:bg-gray-50">
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

        <form onSubmit={handleSubmit}>
          {/* Text Area */}
          <div className="p-4">
            <Textarea
              rows={6}
              placeholder="Lê ơi, bạn đang nghĩ gì thế?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="border-0 resize-none text-lg placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 min-h-[150px]"
            />
          </div>

          {/* Ảnh preview */}
          {mediaFiles.length > 0 && (
            <div className="px-4 pb-4">
              <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden">
                {mediaFiles.map((file, i) =>
                  file.type === "image" ? (
                    <div key={i} className="relative aspect-square">
                      <img
                        src={file.url}
                        alt="preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setMediaFiles(mediaFiles.filter((file, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <span className="text-white text-2xl font-bold">-</span>
                      </button>
                    </div>
                  ) : (
                    <div key={i} className="relative aspect-square">
                      <video
                        src={file.url}
                        className="w-full h-full object-cover rounded-lg"
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => setMediaFiles(mediaFiles.filter((file, idx) => idx !== i))}
                        className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Chọn font */}
          <div className="px-4 pb-3 flex items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent">
                Aa
              </span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <Lightbulb className="w-4 h-4" />
              <span className="text-sm">Bí quyết</span>
            </button>

          </div>

          {/* Thêm post */}
          <div className="px-4 pb-4 border-t border-gray-200 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Thêm vào bài viết của bạn</span>
            </div>
            <div className="flex items-center gap-1">
              {/* Photo/Video */}
              <button
                type="button"
                onClick={handleFileInputClick}
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors group"
                title="Ảnh/Video"
              >
                <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <Image className="w-5 h-5 text-white" />
                </div>
              </button>
              <input
                id="file-input"
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleUploadFiles}
                className="hidden"
              />

              {/* Tag Friends */}
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors group"
                title="Gắn thẻ bạn bè"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
              </button>

              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors group"
                title="Thêm"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-400 flex items-center justify-center group-hover:bg-gray-500 transition-colors">
                  <MoreHorizontal className="w-5 h-5 text-white" />
                </div>
              </button>
            </div>
          </div>

          {/* Submit*/}
          <div className="p-4 border-t border-gray-200">
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
              disabled={!content.trim()}
            >
              Tiếp
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

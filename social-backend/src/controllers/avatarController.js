const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { User } = require('../models');

// Cấu hình lưu avatar - dùng absolute path
const avatarDir = path.join(__dirname, '../../upload/avatars');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Tạo folder nếu chưa tồn tại
        if (!fs.existsSync(avatarDir)) {
            fs.mkdirSync(avatarDir, { recursive: true });
        }
        cb(null, avatarDir);
    },
    filename: (req, file, cb) => {
        // Random filename + extension
        const ext = path.extname(file.originalname).toLowerCase();
        const randomName = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, randomName);
    }
});

const uploadAvatar = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB cho avatar
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ nhận file ảnh (jpg, png, gif, webp)'));
        }
    }
});

// Controller upload avatar
const handleUploadAvatar = async(req, res) => {
    const userId = req.userId;
    if (!req.file) {
        return res.status(400).json({ message: "Không có file được upload" });
    }

    try {
        // Trả về URL đầy đủ
        const avatarUrl = `http://localhost:5001/upload/avatars/${req.file.filename}`;
        const user = await User.findByPk(userId);
        if(!user){
            return res.status(404).json({ message: "Không tìm thấy user" });
        }
        //cập nhật avatar
        user.avatar = avatarUrl;
        await user.save();
        return res.status(200).json({
            message: "Upload avatar thành công",
            user
        });
    } catch (error) {
        console.error("Lỗi upload avatar:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

module.exports = { uploadAvatar, handleUploadAvatar };

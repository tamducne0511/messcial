const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

//cấu hình nơi lưu file - dùng absolute path
const uploadsDir = path.join(__dirname, '../../upload/posts');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Tạo folder nếu chưa tồn tại
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Random filename + extension để tránh trùng
        const ext = path.extname(file.originalname).toLowerCase();
        const randomName = crypto.randomBytes(16).toString('hex') + ext;
        cb(null, randomName);
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('File type not allowed. Chỉ nhận ảnh (jpg, png, gif, webp) và video (mp4, webm, mov)'));
        }
    }
})

//controller trả về url sau khi upload
const uploadMedia = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Không có file được upload" });
    }

    try {
        // Trả về URL đầy đủ
        const fileUrl = `http://localhost:5001/upload/posts/${req.file.filename}`;
        return res.status(200).json({
            message: "Upload thành công",
            url: fileUrl,
            filename: req.file.filename,
            type: req.file.mimetype.startsWith('image') ? 'image' : 'video'
        });
    } catch (error) {
        console.error("Lỗi upload file:", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

module.exports = { upload, uploadMedia }
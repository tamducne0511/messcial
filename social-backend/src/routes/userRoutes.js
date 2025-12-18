const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { uploadAvatar, handleUploadAvatar } = require('../controllers/avatarController');
const { middleware: authMiddleware } = require('../middlewares/authMiddleware')

// Lấy thông tin người dùng hiện tại
router.get('/me', userController.fetchMe);

// Upload avatar
router.post('/avatar', authMiddleware, uploadAvatar.single('file'), handleUploadAvatar);

// Cập nhật thông tin người dùng
router.put('/me', userController.updateProfile);

// Đổi mật khẩu
router.put('/me/password', userController.updatePassword);

// Lấy thông tin của user để hiện thị trong trang cá nhân
router.get('/:userId', userController.getUserInfo);
module.exports = router;
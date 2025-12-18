const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { middleware: authMiddleware } = require('../middlewares/authMiddleware');

//lấy danh sách thông báo
router.get('/notifications', authMiddleware, notificationController.getNotifications);
//đánh dấu thông báo đã đọc
router.put('/notifications/:id/read', authMiddleware, notificationController.markAsRead);
//đếm số thông báo chưa đọc
router.get('/notifications/count-unread', authMiddleware, notificationController.countUnreadNotifications);

module.exports = router;
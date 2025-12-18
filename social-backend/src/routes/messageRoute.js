const express = require('express');
const router = express.Router();
const { middleware } = require('../middlewares/authMiddleware');
const messageController = require('../controllers/messageController');
//route để gửi tin nhắn
router.post('/send', middleware, messageController.sendMessage);
//đánh dấu tin nhắn đã đọc
router.put('/mark-read/:conversationId', middleware, messageController.markMessagesAsRead);
router.get('/:conversationId', middleware, messageController.getMessages);
router.put('/:messageId', middleware, messageController.updateMessage);
router.delete('/:messageId', middleware, messageController.deleteMessage);
router.post('/search/:conversationId', middleware, messageController.searchMessages);
module.exports = router;
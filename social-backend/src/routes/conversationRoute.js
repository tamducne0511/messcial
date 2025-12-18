const express = require('express');
const router = express.Router();
const { middleware } = require('../middlewares/authMiddleware');
const conversationController = require('../controllers/conversationController');

router.post('/create', middleware, conversationController.createChat);
//danh sách đoạn chat
router.get('/', middleware, conversationController.getConversations);
//tìm và tạo đoạn chat 1-1
router.post('/find-or-create', middleware, conversationController.findOrCreateChat);
//tạo cuộc trò chuyện nhóm
router.post('/create-group', middleware, conversationController.createGroupChat);
module.exports = router;
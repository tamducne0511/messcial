const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { middleware: authMiddleware } = require('../middlewares/authMiddleware');

//route để tạo comment mới
router.post('/create', authMiddleware, commentController.createComment);
//route để cập nhật comment
router.put('/update/:commentId', authMiddleware, commentController.updateComment);
//route để xóa comment kèm replies
router.delete('/delete/:commentId', authMiddleware, commentController.deleteComment);
//route để lấy đếm danh sách comment
// Đếm số comment của post
router.get('/post/:postId/count', commentController.countCommentsByPost);
// Lấy danh sách comment của post
router.get('/post/:postId', commentController.getCommentsByPost);
//route để lấy bài viết bởi comment
router.get('/comment/:commentId/post',authMiddleware, commentController.getPostByComment);

module.exports = router;
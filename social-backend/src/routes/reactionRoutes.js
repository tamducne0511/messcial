const express = require('express');
const router = express.Router();
const reactionController = require('../controllers/reactionController');
//React bài post
router.post('/post/:postId', reactionController.reactPost);
//Đếm react của post
router.get('/post/:postId/count', reactionController.countReactionsByPost);
//React comment
router.post('/comment/:commentId', reactionController.reactComment);
//Đếm react của comment
router.get('/comment/:commentId/count', reactionController.countReactionsByComment);
// xóa react bài post
router.delete('/post/:postId', reactionController.deleteReact)
//xóa react comment
router.delete('/comment/:commentId', reactionController.deleteReactComment)
module.exports = router;
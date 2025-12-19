const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const {middleware} = require('../middlewares/authMiddleware')

//Tạo mới bài viết
router.post('/create',middleware, postController.createPost);
//cập nhật bài post
router.put('/update/:postId',middleware, postController.updatePost);
//Xóa bài post
router.delete('/delete/:postId', middleware, postController.deletePost);
//Chi tiết bài post
router.get('/details/:postId',middleware, postController.getPostDetails);
//Lấy danh sách bài post
router.get('/list', postController.getPosts);
//lấy post của user
router.get('/user/:userId', middleware, postController.getUserPosts)
//all post
router.get('/all', postController.getAllPost )
//lấy tất cả ảnh và video theo userId
router.get('/images/:userId', middleware, postController.getAllImages)
//chia sẻ bài post
router.post('/share', middleware, postController.sharePost);

module.exports = router;
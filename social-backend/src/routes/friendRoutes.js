const express = require('express');
const friendController = require('../controllers/friendController');
const {middleware} = require('../middlewares/authMiddleware');
const router = express.Router();

// Route để lấy danh sách bạn bè
router.get('/friends', middleware, friendController.getFriendsList);
//route để lấy danh sách bạn bè tìm kiếm theo userId ởparam
router.get('/friends/list/:userId', middleware, friendController.listFriendsByUserId);
// Route để gửi lời mời kết bạn
router.post('/friends/request', middleware, friendController.sendFriendRequest);
// Route để chấp nhận lời mời kết bạn
router.post('/friends/accept', middleware, friendController.acceptFriendRequest);
//route để từ chối lời mời kết bạn
router.post('/friends/decline', middleware, friendController.rejectFriendRequest);
//route để hủy lời mời kết bạn
router.post('/friends/cancel', middleware, friendController.cancelFriendRequest);
//route để hủy kết bạn
router.delete('/friends/:id', middleware, friendController.unfriend);
//route để hủy kết bạn dựa vào id của nguời dùng và user id
router.delete('/friends/unfriend/:id', middleware, friendController.unfriendById);
//route để lấy danh sách lời mời kết bạn
router.get('/friends/requests', middleware, friendController.getFriendRequests);
//route để lấy dánh sách user không phải bạn bè
router.get('/nonfriends', middleware, friendController.getNonFriendsList);
//danh sách user
router.get('/allusers', middleware, friendController.getUser)
//route để lấy danh sách bạn chung với 2 user
router.get('/commonfriends/:friendId', middleware, friendController.getCommonFriends);
module.exports = router;
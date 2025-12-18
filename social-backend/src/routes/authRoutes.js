const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Đăng ký
router.post('/signup', authController.signUp);
// Đăng nhập
router.post('/signin', authController.signIn);
// Đăng xuất
router.post('/signout', authController.signOut);
//refresh token
module.exports = router;
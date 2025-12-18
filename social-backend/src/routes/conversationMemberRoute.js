const express = require('express');
const router = express.Router();
const { middleware } = require('../middlewares/authMiddleware');
const conversationController = require('../controllers/conversationController');
const conversationMemberController = require('../controllers/conversationMemberController');

router.post('/add-members', middleware, conversationMemberController.addMember);

router.delete('/remove-members/:conversationId&:memberId', middleware, conversationMemberController.removeMember);

router.get('/get-members/:conversationId', middleware, conversationMemberController.getMembers);

router.delete('/leave-conversation/:conversationId', middleware, conversationMemberController.leaveConversation);
module.exports = router;
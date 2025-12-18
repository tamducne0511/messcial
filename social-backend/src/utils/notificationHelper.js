const Notification = require('../models/Notification');
const User = require('../models/User');
const { io } = require('../../socket');
const { emitToNotificationMembers } = require('../../socket/index');
const createNotification = async (userId, type, content, senderId, relatedId = null) => {
    if (!userId || !type || !content || !senderId ) {
        throw new Error("Thieu thong tin thong bao");
    }
    try {
        const notification = await Notification.create({
            userId, //người nhận
            type, //loại thông báo
            content, //nội dung thông báo
            senderId, //người gửi
            relatedId //id liên quan
        });
        // Lấy thông tin đầy đủ của notification kèm sender info
        const notificationWithSender = await Notification.findByPk(notification.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }
            ]
        });
        //emit event đến room user nhận thông báo
        await emitToNotificationMembers(userId, 'new_notification', {
            notification: notificationWithSender
        });
        console.log("new notification", notificationWithSender);
        return notificationWithSender;
    } catch (error) {
        console.error("Loi khi tao thong bao", error);
        throw error;
    }
}

module.exports = {
    createNotification
}
const Notification = require('../models/Notification');
const User = require('../models/User');
//Lấy danh sách thông báo của chính user đó
const getNotifications = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;
    const userId = req.userId;
    try {
        const {rows: notifications, count: total} = await Notification.findAndCountAll({
            where: {
                userId: userId
            },
            include: [
                {
                    model: User,
                    as: 'sender',
                    attributes: ['id', 'username', 'displayName', 'avatar']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });
        return res.status(200).json({
            currentPage: page,
            totalNotifications: total,
            totalPages: Math.ceil(total / limit),
            notifications
        });
    } catch (error) {
        console.error("Loi khi lay danh sach thong bao", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

//Đánh dấu thông báo đã đọc
const markAsRead = async (req, res) => {
    const notificationId = req.params.id;
    const userId = req.userId;
    try {
        const notification = await Notification.findByPk(notificationId);
        if (!notification) {
            return res.status(404).json({ message: "Thong bao khong ton tai" });
        }
        // Kiểm tra xem thông báo có thuộc về user này không
        if (notification.userId !== userId) {
            return res.status(403).json({ message: "Ban khong co quyen danh dau thong bao nay" });
        }
        notification.isRead = true;
        await notification.save();
        return res.status(200).json({ message: "Thong bao da doc" });
    } catch (error) {
        console.error("Loi khi danh dau thong bao da doc", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}
//đếm số thông báo chưa đọc
const countUnreadNotifications = async (req, res) => {
    const userId = req.userId;
    try {
        const count = await Notification.count({
            where: {
                userId: userId
                , isRead: false
            }
        });
        return res.status(200).json({ unreadCount: count });
    } catch (error) {
        console.error("Loi khi dem so thong bao chua doc", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

module.exports = {
    getNotifications,
    markAsRead,
    countUnreadNotifications
}
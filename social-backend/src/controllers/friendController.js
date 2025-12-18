const { Friend, User } = require('../models');
const { Op, Sequelize } = require('sequelize');
const { createNotification } = require('../utils/notificationHelper');
const sequelize = require('../config/db');
// danh sách bạn bè
const getFriendsList = async (req, res) => {
    const userId = req.userId;
    try {
        const friends = await Friend.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userId: userId },
                    { friendId: userId }
                ]
            },
            attributes: ['id', 'userId', 'friendId', 'status', 'createdAt'],
            include: [
                { model: User, as: 'requester', attributes: ['id', 'username', 'avatar'] },
                { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
            ],
        });
        const friendsList = friends.map(f => {
            const friendUser = f.requester.id === userId ? f.receiver : f.requester;
            return {
                id: f.id,           // id bản ghi Friend
                friendId: friendUser.id, // id user bạn bè
                username: friendUser.username,
                avatar: friendUser.avatar
            }
        });
        console.log(friendsList)
        return res.status(200).json({ friendsList });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách bạn bè", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};

//gửi lời mời kết bạn
const sendFriendRequest = async (req, res) => {
    const userId = req.userId;
    console.log("userId:", userId);
    const { friendId } = req.body;
    try {
        //Kiểm tre friendID với user id
        if (userId === friendId) {
            return res.status(400).json({ message: "Khong the ket ban voi chinh minh" });
        }
        //Kiểm tra friend id có tồn tại khôn
        const friendUser = await User.findByPk(friendId);
        if (!friendUser) {
            return res.status(404).json({ message: "User ket ban khong ton tai" });
        }
        //Kiêm tra bạn bè
        const isFriend = await Friend.findOne({
            where: {
                status: "accepted",
                [Op.or]: [
                    { userId, friendId },
                    { userId: friendId, friendId: userId }
                ]
            }
        });
        if (isFriend) {
            return res.status(400).json({ message: "Hai bạn đã là bạn bè" });
        }
        //Kiểm tra đã gửi lời mời kết bạn chưa
        const existed = await Friend.findOne({
            where: {
                status: 'pending',
                [Op.or]: [
                    { userId, friendId },
                    { userId: friendId, friendId: userId }
                ]
            }
        });
        if (existed) {
            return res.status(400).json({ message: "Da gui loi moi ket ban truoc do" });
        }
        //Tạo lời mời kết bạn
        await Friend.create({
            userId,
            friendId,
            status: 'pending'
        });

        //tạo thông báo có friend request cho người nhận
        await createNotification(friendId, 'friend_request', `${userId} đã gửi lời mời kết bạn`, userId, friendId);
        return res.status(200).json({ message: "Da gui loi moi ket ban" });

    } catch (error) {
        console.error("Lỗi khi gửi lời mời kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
// chấp nhận lời mời
const acceptFriendRequest = async (req, res) => {
    const userId = req.userId;
    const { friendId } = req.body;
    try {
        //Kiểm tra lời mời kết bạn tồn tại hay không
        const friendRequest = await Friend.findOne({
            //điều kiện để lấy lời mời kết bạn là userId phải là friendId và friendId phải là userId và status phải là pending
            where: {
                userId: friendId,
                friendId: userId,
                status: 'pending'
            }
        });
        if (!friendRequest) {
            return res.status(404).json({ message: "Loi moi ket ban khong ton tai" });
        } //Cập nhật trạng thái thành đã chấp nhận
        friendRequest.status = 'accepted';
        await friendRequest.save();
        await Friend.destroy({
            where: {
                status: 'pending',
                [Op.or]: [
                    { userId, friendId: userId },
                    { userId: userId, friendId }
                ]
            }
        });
        return res.status(200).json({ message: "Da chap nhan loi moi ket ban" });
    } catch (error) {
        console.error("Lỗi khi chấp nhận lời mời kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//Từ choói hoặc hủy lời mới
const rejectFriendRequest = async (req, res) => {
    const userId = req.userId;
    const { friendId } = req.body;
    try {
        //Kiểm tra lời mời kết bạn tồn tại hay không
        const friendRequest = await Friend.findOne({
            where: {
                userId: friendId,
                friendId: userId,
                status: 'pending'
            }
        });
        if (!friendRequest) {
            return res.status(404).json({ message: "Loi moi ket ban khong ton tai" });
        }
        //Xóa lời mời kết bạn
        await friendRequest.destroy();
        return res.status(200).json({ message: "Da tu choi loi moi ket ban" });
    } catch (error) {
        console.error("Lỗi khi từ chối lời mời kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//hủy lời mời kết bạn
const cancelFriendRequest = async (req, res) => {
    const userId = req.userId;
    const { friendId } = req.body;
    try {
        const friendRequest = await Friend.findOne({
            where: {
                userId: userId,
                friendId: friendId,
                status: 'pending'
            }
        });
        if (!friendRequest) {
            return res.status(404).json({ message: "Loi moi ket ban khong ton tai" });
        }
        await friendRequest.destroy();
        return res.status(200).json({ message: "Da huy loi moi ket ban" });
    } catch (error) {
        console.error("Lỗi khi hủy lời mời kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//Hủy kết bạn DỰA VÀO ID BẢNG FRIEND
const unfriend = async (req, res) => {
    const { id } = req.params;
    console.log(id)
    try {
        const friendship = await Friend.findByPk(id);
        if (!friendship) return res.status(404).json({ message: "Không tìm thấy mối quan hệ" });

        await friendship.destroy();
        return res.status(200).json({ message: "Đã hủy kết bạn" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//hủy kết bạn dựa vào id của nguời dùng và user id
const unfriendById = async (req, res) => {
    const { id } = req.params;
    const userId = req.userId;
    try {
        const friendship = await Friend.findOne({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userId: userId, friendId: id },
                    { userId: id, friendId: userId }
                ]
            }
        });
        if (!friendship) return res.status(404).json({ message: "Không tìm thấy mối quan hệ" });
        await friendship.destroy();
        return res.status(200).json({ message: "Đã hủy kết bạn" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}



//danh sách lời mời kết bạn
const getFriendRequests = async (req, res) => {
    const userId = req.userId;
    try {
        //Lấy danh sách lời mời kết bạn
        const friendRequests = await Friend.findAll({
            where: {
                friendId: userId,
                status: 'pending'
            },
            include: [{
                model: User,
                as: 'requester',
                attributes: ['id', 'username', 'email', 'avatar']
            }]
        });
        return res.status(200).json({ friendRequests });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách lời mời kết bạn", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

//danh sách user không phải bạn bè
const getNonFriendsList = async (req, res) => {
    const userId = req.userId;
    try {
        const nonFriends = await User.findAll({
            where: {
                [Op.and]: [
                    {
                        id: {
                            [Op.ne]: userId
                        }
                    },
                    Sequelize.literal(`
      id NOT IN (
        SELECT friendId FROM friends WHERE userId = ${userId} AND status = 'accepted'
        UNION
        SELECT userId FROM friends WHERE friendId = ${userId} AND status = 'accepted'
      )
    `)
                ]
            }
            ,
            attributes: ['id', 'username', 'email', 'avatar']
        });

        return res.status(200).json({ nonFriends });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách người dùng không phải bạn bè", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
};
//danh sachs tất cả user
const getUser = async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;
    const userId = req.userId;
    try {
        // Tạo điều kiện tìm kiếm
        const whereClause = {
            id: { [Op.ne]: userId }
        };

        // Nếu có search term, thêm điều kiện tìm kiếm
        if (search.trim()) {
            const likeClause = { [Op.like]: `%${search}%` };
            whereClause[Op.or] = [
                { username: likeClause },
                { email: likeClause },
                { displayName: likeClause }
            ];
        }

        // Lấy danh sách users (không dùng include với where để không filter users)
        const users = await User.findAndCountAll({
            where: whereClause,
            attributes: ["id", "username", "email", "avatar", "displayName", "bio", "phone"],
            limit: limit,
            offset: offset,
            order: [['username', 'ASC']]
        });

        // Lấy danh sách user IDs để query friend status
        const userIds = users.rows.map(u => u.id);

        // Lấy tất cả quan hệ friend  với các users này
        const friends = await Friend.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { userId: userId, friendId: { [Op.in]: userIds } },
                    { userId: { [Op.in]: userIds }, friendId: userId }
                ]
            }
        });

        // Lấy tất cả lời mời pending với các users này
        const invites = await Friend.findAll({
            where: {
                status: 'pending',
                [Op.or]: [
                    { userId: userId, friendId: { [Op.in]: userIds } },
                    { userId: { [Op.in]: userIds }, friendId: userId }
                ]
            }
        });

        // Tạo map để tra cứu nhanh
        const friendMap = new Map();
        //lấy danh sách bạn bè
        friends.forEach(friend => {
            //nếu friend.userId === userId thì lấy friend.friendId, ngược lại lấy friend.userId
            const friendUserId = friend.userId === userId ? friend.friendId : friend.userId;
            //set friendUserId vào friendMap với giá trị 'accepted'
            friendMap.set(friendUserId, 'accepted');
        });

        const inviteMap = new Map();
        //lấy danh sách lời mời kết bạn
        invites.forEach(invite => {
            const inviteUserId = invite.userId === userId ? invite.friendId : invite.userId;
            // Kiểm tra xem user này có phải là người gửi không
            const isRequester = invite.userId === userId;
            //nếu isRequester là true thì lấy 'sent', ngược lại lấy 'received'
            inviteMap.set(inviteUserId, isRequester ? 'sent' : 'received');
        });

        // Map trạng thái cho từng user
        const usersWithStatus = users.rows.map(user => {
            const isFriend = friendMap.has(user.id);
            const inviteStatus = inviteMap.get(user.id);

            let friendStatus = "Chưa kết bạn";
            let inviteStatusText = "Chưa gửi lời mời";

            if (isFriend) {
                friendStatus = "Bạn bè";
            } else if (inviteStatus === 'sent') {
                inviteStatusText = "Đã gửi lời mời";
            } else if (inviteStatus === 'received') {
                inviteStatusText = "Đã nhận lời mời";
            }

            return {
                ...user.toJSON(),
                friendStatus,
                inviteStatus: inviteStatusText
            };
        });

        const totalPages = Math.ceil(users.count / limit);

        return res.status(200).json({
            currentPage: page,
            users: {
                rows: usersWithStatus,
                count: users.count,
                totalPages: totalPages
            },
            totalUsers: users.count,
            totalPages: totalPages
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: "Lỗi hệ thống" })
    }
}
//danh sách bạn bè tìm kiếm theo userId ởparam
const listFriendsByUserId = async (req, res) => {
    const { userId } = req.params;
    try {
        const friends = await Friend.findAll({
            where: {
                status: 'accepted',
                [Op.or]: [
                    { friendId: userId },
                    { userId: userId }
                ]
            },
            attributes: ['id', 'userId', 'friendId', 'status', 'createdAt'],
            include: [
                { model: User, as: 'requester', attributes: ['id', 'username', 'avatar'] },
                { model: User, as: 'receiver', attributes: ['id', 'username', 'avatar'] },
            ],
        });
        const uid = Number(userId);
        const friendsList = friends.map(f => {
            const friendUser = f.requester.id === uid ? f.receiver : f.requester;
            //nếu requester.id === userId thì lấy receiver, ngược lại lấy requester
            return {
                id: f.id,// id bản ghi Friend
                friendId: friendUser.id,// id user bạn bè
                username: friendUser.username,// username user bạn bè
                avatar: friendUser.avatar// avatar user bạn bè
            }
        });
        console.log("friendsList:", friendsList);
        return res.status(200).json({ friendsList });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}
//Danh sách bạn chung với 2 user
const getCommonFriends = async (req, res) => {
    const userId = req.userId;
    const { friendId } = req.params;
    try {
        const commonFriends = await sequelize.query(
            `
            SELECT DISTINCT u.id, u.username, u.avatar
            FROM friends f1
            JOIN friends f2
              ON (
                   CASE
                     WHEN f1.userId = ? THEN f1.friendId
                     ELSE f1.userId
                   END
                 ) = (
                   CASE
                     WHEN f2.userId = ? THEN f2.friendId
                     ELSE f2.userId
                   END
                 )
            JOIN users u
              ON u.id = (
                CASE
                  WHEN f1.userId = ? THEN f1.friendId
                  ELSE f1.userId
                END
              )
            WHERE f1.status = 'accepted'
              AND f2.status = 'accepted'
              AND (f1.userId = ? OR f1.friendId = ?)
              AND (f2.userId = ? OR f2.friendId = ?)
            `,
            {
                replacements: [
                    userId,        // f1.userId = ?
                    friendId,      // f2.userId = ?
                    userId,        // join user
                    userId, userId,// f1 condition
                    friendId, friendId // f2 condition
                ],
                type: sequelize.QueryTypes.SELECT
            }
        );


        return res.status(200).json({ commonFriends });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}


module.exports = {
    getFriendsList,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    unfriend,
    getFriendRequests,
    getNonFriendsList,
    getUser,
    unfriendById,
    cancelFriendRequest,
    listFriendsByUserId,
    getCommonFriends,
}
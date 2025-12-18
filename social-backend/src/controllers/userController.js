const { User } = require('../models');
const bcrypt = require('bcrypt');

require("dotenv").config();

const fetchMe = async (req, res) => {
    // Lấy từ middlewares
    const userId = req.userId;
    try {
        if (!userId) {
            return res.status(401).json({ message: "Chua xac thuc" });
        }
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'email', 'displayName', 'bio', 'avatar', 'phone']
        });
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Loi khi lay profile", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

const updateProfile = async (req, res) => {
    const userId = req.userId;
    const { username, email, displayName, bio, avatar, phone } = req.body;
    try {
        //check user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User không tồn tại" });
        }

        // Cập nhật các trường được phép
        if (username) user.username = username
        if (email) user.email = email
        if (displayName) user.displayName = displayName;
        if (bio !== undefined) user.bio = bio; // cho phép set bio = ""
        if (avatar) user.avatar = avatar; // avatar URL từ upload
        if (phone !== undefined) user.phone = phone;

        await user.save();

        return res.status(200).json({
            message: "Cập nhật profile thành công",
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.displayName,
                avatar: user.avatar,
                bio: user.bio,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật profile", error);
        return res.status(500).json({ message: "Lỗi hệ thống" });
    }
}

const updatePassword = async (req, res) => {
    const userId = req.userId;
    const { oldPassword, newPassword } = req.body;
    try {
        //check user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: "User khong ton tai" });
        }
        //check old password
        const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
        if (!isMatch) {
            return res.status(400).json({ message: "Mat khau cu khong dung" });
        }
        //update password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.hashedPassword = hashedPassword;
        await user.save();
        return res.status(200).json({ message: "Cap nhat mat khau thanh cong" });
    } catch (error) {
        console.error("Loi khi cap nhat mat khau", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

//lấy thông tin của user để hiện thị trong trang cá nhân
const getUserInfo = async(req,res)=>{
    const userId = req.params.userId;
    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'email', 'displayName', 'bio', 'avatar', 'phone']
        });
        if (!user) {
            return res.status(404).json({ message: "User khong ton tai" });
        }
        return res.status(200).json({ user });
    } catch (error) {
        console.error("Loi khi lay thong tin user", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

module.exports = {
    updateProfile,
    updatePassword,
    fetchMe,
    getUserInfo
};

const { User, Session } = require('../models');
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const { Sequelize, Op } = require('sequelize');
require("dotenv").config();
const Access_Token_TTL = '200m';
const Refresh_Token_TTL = 20 * 24 * 60 * 60 * 1000;

const signUp = async (req, res) => {
    try {
        const { username, email, password, displayName } = req.body;

        // Kiem tra user da ton tai chua
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: "Email da duoc su dung" });
        }
        // Bam mat khau
        const hashedPassword = await bcrypt.hash(password, 10);
        // Tao user moi
        const newUser = await User.create({
            username,
            email,
            hashedPassword,
            displayName
        });
        return res.status(201).json({ message: "Tao tai khoan thanh cong", userId: newUser.id });
    } catch (error) {
        console.error("Loi khi goi sign up", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

const signIn = async (req, res) => {
    const { email, password } = req.body;
    try {
        // Kiem tra user ton tai
        const user = await User.findOne({ where: { email } });
        console.log("User dang nhap:", user);
        if (!user) {
            return res.status(400).json({ message: "Email hoac mat khau khong dung" });
        }
        // Kiem tra mat khau
        const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Email hoac mat khau khong dung" });
        }
        // Tao access token va refresh token
        const accessToken = jwt.sign({ userId: user.id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: Access_Token_TTL });
        //tao refresh token
        const refreshToken = crypto.randomBytes(64).toString('hex');
        console.log("Refresh token:", refreshToken);
        //tạo session để lưu refresh trong db
        //Kiểm tra trong db nếu có refresh tokeken theo userId chua het han giu nguyen het han thi cap nhat lai khong phai moi lần đăng nhập là 1 refresh riêng
        const existingSession = await Session.findOne({ where: { userId: user.id, expiresAt: { [Op.gt]: new Date() } } });
        if (existingSession) {
            //cập nhật lại refresh token và thời gian hết hạn
            existingSession.refreshToken = refreshToken;
            existingSession.expiresAt = new Date(Date.now() + Refresh_Token_TTL);
            await existingSession.save();
        } else {
            //tạo mới session
            await Session.create({
                userId: user.id,
                refreshToken: refreshToken,
                expiresAt: new Date(Date.now() + Refresh_Token_TTL) // 7 day
            });
        }
        //trả refresh token về trong cookie
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            maxAge: Refresh_Token_TTL //7 days,
        });
        return res.status(200).json({
            message: "Dang nhap thanh cong",
            accessToken
        });

    } catch (error) {
        console.error("Loi khi goi sign in", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}

const signOut = async (req, res) => {
    const refreshToken = req.cookies?.refreshToken;
    try {
        console.log("Dang xuat voi refresh token:", refreshToken);
        if (refreshToken) {
            //xoa session trong db
            await Session.destroy({ where: { refreshToken } });
            //xoa cookie
            res.clearCookie("refreshToken", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            });
            return res.status(200).json({ message: "Dang xuat thanh cong" });
        }
    } catch (error) {
        console.error("Loi khi goi sign out", error);
        return res.status(500).json({ message: "Loi he thong" });
    }
}



module.exports = {
    signUp, signIn, signOut
};
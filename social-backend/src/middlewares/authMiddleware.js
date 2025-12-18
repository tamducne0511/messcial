const jwt = require('jsonwebtoken');
const { User } = require('../models');
const middleware = async (req, res, next) => {
    //lay token tu header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; //bearer<token> lấy phần tử sau
    console.log(token);
    if (!token) {
        return res.status(401).json({ message: "Khong co token, truy cap bi tu choi" });
    }
    try {
        //verify token
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const userId = decoded.userId; //lưu userId vào req để sử dụng trong các controller
        //Tìm user trong db
        const user = await User.findByPk(userId, {
            attributes: { exclude: ['hashedPassword'] } //không lấy trường hashedPassword
        });
        if (!user) {
            return res.status(404).json({ message: "User khong ton tai" });
        }
        req.userId = userId; //lưu user vào req để sử dụng trong các controller
        next(); //cho phép tiếp tục đến controller
    } catch (error) {
        console.error("Loi xac thuc token", error);
        return res.status(403).json({ message: "Token khong hop le hoac da het han" });
    }
}

module.exports = {middleware};
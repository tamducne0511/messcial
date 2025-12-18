const { Sequelize } = require("sequelize");
require("dotenv").config();
// Tạo kết nối đến MySQL

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);
// Kiểm tra kết nối
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("Kết nối MySQL thành công!");
  } catch (err) {
    console.error("Lỗi kết nối MySQL:", err);
  }
}

testConnection();
module.exports = sequelize;

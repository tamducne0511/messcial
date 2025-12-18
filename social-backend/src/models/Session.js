const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const Session = sequelize.define('Session', {
    refreshToken: { type: DataTypes.STRING, allowNull: false, unique: true },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
},
    {
        timestamps: true, tableName: 'sessions'
    }
);
Session.belongsTo(User, { foreignKey: 'userId'});
User.hasMany(Session, { foreignKey: 'userId' });
module.exports = Session;
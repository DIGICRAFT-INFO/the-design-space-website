const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TokenBlacklist = sequelize.define('TokenBlacklist', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'token_blacklist',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
  });

  return TokenBlacklist;
};
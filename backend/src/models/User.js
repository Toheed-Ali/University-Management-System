const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  firstName: {
    type: DataTypes.STRING(100)
  },
  lastName: {
    type: DataTypes.STRING(100)
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  passwordHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'teacher', 'student'),
    defaultValue: 'admin',
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'graduated'),
    defaultValue: 'active',
    allowNull: false
  },
  lastLogin: {
    type: DataTypes.DATE
  },
  tokenVersion: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false
  }
}, {
  tableName: 'users',
  timestamps: true,
  indexes: [
    { fields: ['email'], unique: true },
    { fields: ['role'] },
    { fields: ['status'] }
  ]
});

// Virtual field for full name
User.prototype.getFullName = function () {
  return [this.firstName, this.lastName].filter(Boolean).join(' ').trim();
};

module.exports = User;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Teacher = sequelize.define('Teacher', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },

    employeeId: {
        type: DataTypes.STRING(50),
        unique: true
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    cnic: {
        type: DataTypes.STRING(20),
        unique: true
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY
    },
    joiningDate: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other')
    },
    nationality: {
        type: DataTypes.STRING(50)
    },
    religion: {
        type: DataTypes.STRING(50)
    },
    employmentType: {
        type: DataTypes.ENUM('permanent', 'visiting'),
        defaultValue: 'permanent'
    }
}, {
    tableName: 'teachers',
    timestamps: true,
    indexes: [
        { fields: ['userId'] }
    ]
});

module.exports = Teacher;

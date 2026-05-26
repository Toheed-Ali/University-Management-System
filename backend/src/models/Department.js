const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Department = sequelize.define('Department', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    institutionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'institution',
            key: 'id'
        }
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    degreeTitle: {
        type: DataTypes.STRING(255),
        allowNull: false
    },

    totalCreditHours: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    maxCreditsPerSemester: {
        type: DataTypes.INTEGER,
        defaultValue: 18
    },
    headOfDepartment: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'departments',
    timestamps: true,
    indexes: [
        { fields: ['code'] },
        { fields: ['status'] }
    ]
});

module.exports = Department;

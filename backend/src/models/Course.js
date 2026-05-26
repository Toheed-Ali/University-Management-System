const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'departments',
            key: 'id'
        }
    },
    code: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    credits: {
        type: DataTypes.INTEGER,
        defaultValue: 3
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    tableName: 'courses',
    timestamps: true,
    indexes: [
        { fields: ['departmentId'] },
        { fields: ['code'] },
        { fields: ['status'] },
        // Unique constraint: no duplicate course names in same department
        {
            unique: true,
            fields: ['departmentId', 'name'],
            name: 'unique_course_name_per_department'
        },
        // Unique constraint: no duplicate course codes in same department
        {
            unique: true,
            fields: ['departmentId', 'code'],
            name: 'unique_course_code_per_department'
        }
    ]
});

module.exports = Course;

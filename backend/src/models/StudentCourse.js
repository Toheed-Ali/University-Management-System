const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const StudentCourse = sequelize.define('StudentCourse', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'students',
            key: 'id'
        }
    },
    courseOfferingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'course_offerings',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('pending', 'enrolled', 'rejected', 'dropped', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    grade: {
        type: DataTypes.STRING(5),
        allowNull: true
    },
    gradePoints: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        defaultValue: 0.00
    },
    enrollmentDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'student_courses',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['studentId', 'courseOfferingId']
        }
    ]
});

module.exports = StudentCourse;

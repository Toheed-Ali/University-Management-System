const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const CourseOffering = sequelize.define('CourseOffering', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'courses',
            key: 'id'
        }
    },
    teacherId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'teachers',
            key: 'id'
        }
    },
    departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'departments',
            key: 'id'
        }
    },
    batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'batches',
            key: 'id'
        }
    },
    sectionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sections',
            key: 'id'
        }
    },
    semester: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'completed'),
        defaultValue: 'active'
    },
    resultStatus: {
        type: DataTypes.ENUM('pending', 'submitted', 'approved', 'rejected'),
        defaultValue: 'pending'
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    maxSeats: {
        type: DataTypes.INTEGER,
        defaultValue: 50
    },
    enrolledCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: 'course_offerings',
    timestamps: true,
    indexes: [
        { fields: ['courseId'] },
        { fields: ['teacherId'] },
        { fields: ['departmentId'] },
        { fields: ['batchId'] },
        { fields: ['sectionId'] },
        { fields: ['semester'] },
        {
            unique: true,
            fields: ['courseId', 'batchId', 'sectionId', 'semester'],
            name: 'unique_course_batch_section_semester'
        }
    ]
});

module.exports = CourseOffering;

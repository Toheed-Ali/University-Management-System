const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Assignment = sequelize.define('Assignment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    courseOfferingId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'course_offerings',
            key: 'id'
        }
    },
    assignmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential assignment number (1, 2, 3, ...)'
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    totalMarks: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    dueDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'teachers',
            key: 'id'
        }
    },
    plagiarismReportUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    plagiarismThreshold: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 50
    },
    plagiarismMatchCount: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'assignments',
    timestamps: true,
    indexes: [
        { fields: ['courseOfferingId'] },
        { fields: ['courseOfferingId', 'assignmentNumber'], unique: true }
    ]
});

module.exports = Assignment;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    assignmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'assignments',
            key: 'id'
        }
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'students',
            key: 'id'
        }
    },
    submissionFile: {
        type: DataTypes.TEXT,
        allowNull: false,
        get() {
            const rawValue = this.getDataValue('submissionFile');
            try {
                return rawValue ? JSON.parse(rawValue) : [];
            } catch (e) {
                // To support legacy single-file strings safely
                return rawValue ? [rawValue] : [];
            }
        },
        set(value) {
            this.setDataValue('submissionFile', Array.isArray(value) ? JSON.stringify(value) : JSON.stringify([value]));
        }
    },
    submittedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    marksAwarded: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('draft', 'submitted', 'graded', 'late'),
        allowNull: false,
        defaultValue: 'draft'
    },
    gradedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'teachers',
            key: 'id'
        }
    },
    gradedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'assignment_submissions',
    timestamps: true
});

module.exports = AssignmentSubmission;

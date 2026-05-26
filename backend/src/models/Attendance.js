const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Attendance = sequelize.define('Attendance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lectureId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'lectures',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    studentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'students',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('present', 'absent'),
        allowNull: false,
        defaultValue: 'absent'
    },
    markedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'teachers',
            key: 'id'
        },
        comment: 'Teacher who marked the attendance'
    },
    markedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when attendance was marked'
    }
}, {
    tableName: 'attendances',
    timestamps: true,
    indexes: [
        { fields: ['lectureId'] },
        { fields: ['studentId'] },
        { fields: ['lectureId', 'studentId'], unique: true }
    ]
});

module.exports = Attendance;

const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Student = sequelize.define('Student', {
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
    rollNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    batchId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'batches',
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
        defaultValue: 1
    },
    cgpa: {
        type: DataTypes.DECIMAL(3, 2),
        defaultValue: 0.00
    },
    totalCredits: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    earnedCredits: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other')
    },
    nationality: {
        type: DataTypes.STRING(100)
    },
    religion: {
        type: DataTypes.STRING(50)
    },
    fatherName: {
        type: DataTypes.STRING(100)
    },
    cnic: {
        type: DataTypes.STRING(20)
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    registrationStartDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    registrationEndDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'students',
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['departmentId'] },
        { fields: ['rollNumber'], unique: true },
        { fields: ['semester'] }
    ]
});

module.exports = Student;

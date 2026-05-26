const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

// Single institution settings for the LMS
const Institution = sequelize.define('Institution', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    shortName: {
        type: DataTypes.STRING(50)
    },
    city: {
        type: DataTypes.STRING(100)
    },
    province: {
        type: DataTypes.STRING(100)
    },
    country: {
        type: DataTypes.STRING(100),
        defaultValue: 'Pakistan'
    },
    // Registration window settings
    registrationStartDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    registrationEndDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING(255),
        defaultValue: 'admin@university.edu'
    },
    address: {
        type: DataTypes.STRING(500),
        defaultValue: 'Lahore, Punjab, Pakistan'
    }
}, {
    tableName: 'institution',
    timestamps: true
});

module.exports = Institution;

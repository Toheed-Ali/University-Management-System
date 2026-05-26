const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Section = sequelize.define('Section', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
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
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    timestamps: true,
    tableName: 'sections',
    indexes: [
        {
            unique: true,
            fields: ['name', 'batchId'],
            name: 'unique_section_name_per_batch'
        }
    ]
});

module.exports = Section;

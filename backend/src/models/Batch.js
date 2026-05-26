const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Batch = sequelize.define('Batch', {
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
    year: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
}, {
    timestamps: true,
    tableName: 'batches',
    indexes: [
        {
            unique: true,
            fields: ['name', 'departmentId'],
            name: 'unique_batch_name_per_department'
        }
    ]
});

module.exports = Batch;

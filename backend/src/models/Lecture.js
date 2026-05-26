const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Lecture = sequelize.define('Lecture', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    offeringId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'course_offerings',
            key: 'id'
        }
    },
    lectureNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Sequential lecture number (1, 2, 3, ...)'
    },
    lectureDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    topic: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Optional topic/title for the lecture'
    },
    createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'teachers',
            key: 'id'
        },
        comment: 'Teacher who created this lecture'
    }
}, {
    tableName: 'lectures',
    timestamps: true,
    indexes: [
        { fields: ['offeringId'] },
        { fields: ['lectureDate'] },
        { fields: ['offeringId', 'lectureNumber'], unique: true }
    ],
    hooks: {
        beforeSave: async (lecture, options) => {
            // Skip check if offeringId or createdBy is not being changed (optimistic)
            // But for safety, we check on create or if either field changed
            if (lecture.isNewRecord || lecture.changed('offeringId') || lecture.changed('createdBy')) {
                const CourseOffering = sequelize.models.CourseOffering;
                const offering = await CourseOffering.findByPk(lecture.offeringId);

                if (!offering) {
                    throw new Error('Associated Course Offering not found');
                }

                if (offering.teacherId !== lecture.createdBy) {
                    throw new Error('Only the assigned teacher of the offering can create or manage lectures');
                }
            }
        }
    }
});

module.exports = Lecture;

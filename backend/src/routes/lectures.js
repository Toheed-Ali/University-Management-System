const express = require('express');
const { Lecture, CourseOffering, Teacher, Student, StudentCourse, Attendance } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create a new lecture for an offering (teacher only)
router.post('/lectures', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { offeringId, lectureDate, topic, lectureNumber: requestedLectureNumber } = req.body;

        if (!offeringId) {
            return res.status(400).json({ success: false, error: 'Offering ID is required' });
        }

        // Get teacher profile
        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        // Verify teacher teaches this offering
        const offering = await CourseOffering.findOne({
            where: { id: offeringId, teacherId: teacher.id }
        });

        if (!offering) {
            return res.status(403).json({ success: false, error: 'Access denied to this offering' });
        }

        // Use provided lecture number or auto-generate
        let lectureNumber;
        if (requestedLectureNumber) {
            // Check if lecture number already exists for this offering
            const existingLecture = await Lecture.findOne({
                where: { offeringId, lectureNumber: requestedLectureNumber }
            });

            if (existingLecture) {
                return res.status(400).json({
                    success: false,
                    error: `Lecture ${requestedLectureNumber} already exists for this offering`
                });
            }

            lectureNumber = requestedLectureNumber;
        } else {
            // Get the next lecture number for this offering
            const lastLecture = await Lecture.findOne({
                where: { offeringId },
                order: [['lectureNumber', 'DESC']]
            });

            lectureNumber = lastLecture ? lastLecture.lectureNumber + 1 : 1;
        }

        // Create the lecture
        const lecture = await Lecture.create({
            offeringId,
            lectureNumber,
            lectureDate: lectureDate || new Date(),
            topic,
            createdBy: teacher.id
        });

        return res.status(201).json({ success: true, data: lecture });
    } catch (error) {
        console.error('Create lecture error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create lecture' });
    }
});

// Get all lectures for an offering
router.get('/lectures/offering/:offeringId', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const { offeringId } = req.params;

        // Verify access based on role
        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({
                attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
                where: { userId: req.user.id }
            });
            const offering = await CourseOffering.findOne({
                where: { id: offeringId, teacherId: teacher.id }
            });
            if (!offering) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        } else if (req.user.role === 'student') {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            const enrollment = await StudentCourse.findOne({
                where: { studentId: student.id, courseOfferingId: offeringId, status: 'enrolled' }
            });
            if (!enrollment) {
                return res.status(403).json({ success: false, error: 'Not enrolled in this offering' });
            }
        }

        const lectures = await Lecture.findAll({
            where: { offeringId },
            order: [['lectureNumber', 'ASC']],
            attributes: ['id', 'lectureNumber', 'lectureDate', 'topic', 'createdAt']
        });

        return res.json({ success: true, data: lectures });
    } catch (error) {
        console.error('Get lectures error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch lectures' });
    }
});

// Delete a lecture (teacher only)
router.delete('/lectures/:id', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { id } = req.params;

        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        const lecture = await Lecture.findByPk(id);
        if (!lecture) {
            return res.status(404).json({ success: false, error: 'Lecture not found' });
        }

        // Verify teacher owns this lecture
        if (lecture.createdBy !== teacher.id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        await Attendance.destroy({ where: { lectureId: lecture.id } });

        await lecture.destroy();

        return res.json({ success: true, message: 'Lecture deleted successfully' });
    } catch (error) {
        console.error('Delete lecture error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete lecture' });
    }
});

module.exports = router;

const express = require('express');
const { Attendance, Lecture, Student, CourseOffering, StudentCourse, User, Teacher } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Mark attendance for a lecture (batch submit) - Teacher only
router.post('/attendance/mark', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { lectureId, attendanceRecords } = req.body;

        if (!lectureId || !Array.isArray(attendanceRecords)) {
            return res.status(400).json({ success: false, error: 'Invalid request data' });
        }

        // Get teacher profile
        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        // Verify lecture exists and teacher has access
        const lecture = await Lecture.findByPk(lectureId, {
            include: [{ model: CourseOffering, as: 'offering' }]
        });

        if (!lecture) {
            return res.status(404).json({ success: false, error: 'Lecture not found' });
        }

        if (lecture.offering.teacherId !== teacher.id) {
            return res.status(403).json({ success: false, error: 'Access denied to this lecture' });
        }

        const markedAt = new Date().toISOString().slice(0, 19).replace('T', ' '); // Format for MySQL
        const results = [];

        // PHASE 2 REQUIREMENT: Raw SQL Transaction for Critical Operation
        const { sequelize } = require('../db');
        console.log('--- STARTING MANAGED SEQUELIZE TRANSACTION FOR ATTENDANCE ---');
        const t = await sequelize.transaction();

        try {
            // Process each attendance record
            for (const record of attendanceRecords) {
                const { studentId, status } = record;
                const finalStatus = status || 'absent';

                // Verify student is enrolled in this offering using raw SQL
                const [enrollmentRaw] = await sequelize.query(`
                    SELECT id FROM student_courses 
                    WHERE studentId = ? AND courseOfferingId = ? AND status = 'enrolled'
                `, { replacements: [studentId, lecture.offeringId], transaction: t });

                if (enrollmentRaw.length === 0) {
                    console.warn(`Student ${studentId} not enrolled in offering ${lecture.offeringId}`);
                    continue; // Skip silently or we could throw to rollback entire batch
                }

                // Create or update attendance record using raw SQL (UPSERT pattern via ON DUPLICATE KEY UPDATE)
                await sequelize.query(`
                    INSERT INTO attendances (lectureId, studentId, status, markedBy, markedAt, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status), 
                        markedBy = VALUES(markedBy), 
                        markedAt = VALUES(markedAt),
                        updatedAt = NOW()
                `, {
                    replacements: [lectureId, studentId, finalStatus, teacher.id, markedAt],
                    transaction: t
                });

                results.push({ studentId, status: finalStatus, created: true });
            }

            // If we successfully processed all records, commit the transaction
            await t.commit();
            console.log('--- COMMITTED RAW SQL TRANSACTION ---');

            return res.json({
                success: true,
                message: 'Attendance marked successfully',
                data: { marked: results.length, details: results }
            });
        } catch (trxError) {
            // Important Phase 2 Requirement: ROLLBACK on error
            console.error('--- ERROR DURING ATTENDANCE UPSERT. ROLLING BACK ---', trxError);
            if (t && !t.finished) await t.rollback();
            throw trxError; // rethrow to be caught by outer catch block
        }

    } catch (error) {
        console.error('Mark attendance error:', error);
        return res.status(500).json({ success: false, error: 'Failed to mark attendance' });
    }
});

// Get attendance for a specific lecture (with student details) - Teacher only
router.get('/attendance/lecture/:lectureId', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const { lectureId } = req.params;

        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        // Verify lecture exists and access
        const lecture = await Lecture.findByPk(lectureId, {
            include: [{ model: CourseOffering, as: 'offering' }]
        });

        if (!lecture || lecture.offering.teacherId !== teacher.id) {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        // Get all enrolled students for this offering
        const enrollments = await StudentCourse.findAll({
            where: { courseOfferingId: lecture.offeringId, status: 'enrolled' },
            include: [{
                model: Student,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }]
            }]
        });

        // Get existing attendance records
        const attendanceRecords = await Attendance.findAll({
            where: { lectureId }
        });

        // Map attendance to students
        const attendanceMap = {};
        attendanceRecords.forEach(att => {
            attendanceMap[att.studentId] = att.status;
        });

        // Combine student info with attendance status
        const studentsWithAttendance = enrollments.map(enrollment => {
            const student = enrollment.Student;
            return {
                studentId: student.id,
                rollNumber: student.rollNumber,
                firstName: student.user.firstName,
                lastName: student.user.lastName,
                email: student.user.email,
                status: attendanceMap[student.id] || 'absent' // Default to absent if not marked
            };
        });

        return res.json({ success: true, data: studentsWithAttendance });
    } catch (error) {
        console.error('Get lecture attendance error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
});

// Get student's attendance for all their enrolled courses - Student only
router.get('/attendance/student/my-attendance', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const student = await Student.findOne({ where: { userId: req.user.id } });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        const { currentOnly } = req.query;
        const whereClause = {
            studentId: student.id,
            status: ['enrolled', 'completed', 'failed']
        };

        if (currentOnly === 'true') {
            whereClause.status = 'enrolled';
        }

        const enrollments = await StudentCourse.findAll({
            where: whereClause,
            include: [{
                model: CourseOffering,
                as: 'CourseOffering',
                include: [
                    {
                        model: require('../models').Course,
                        as: 'course',
                        attributes: ['id', 'name', 'code']
                    },
                    {
                        model: require('../models').Section,
                        as: 'section',
                        attributes: ['id', 'name']
                    },
                    {
                        model: require('../models').Batch,
                        as: 'batch',
                        attributes: ['id', 'name', 'year']
                    }
                ]
            }]
        });

        const result = [];

        // For each enrollment, get attendance data
        for (const enrollment of enrollments) {
            const offering = enrollment.CourseOffering;

            // Get all lectures for this offering
            const lectures = await Lecture.findAll({
                where: { offeringId: offering.id },
                order: [['lectureNumber', 'ASC']],
                attributes: ['id', 'lectureNumber', 'lectureDate', 'topic']
            });

            // Get attendance records for this student in this offering (via Lecture join)
            const attendanceRecords = await Attendance.findAll({
                where: { studentId: student.id },
                include: [{
                    model: Lecture,
                    as: 'lecture',
                    where: { offeringId: offering.id },
                    attributes: [] // We only need it for the JOIN filter
                }]
            });

            // Map attendance by lecture ID
            const attendanceMap = {};
            attendanceRecords.forEach(att => {
                attendanceMap[att.lectureId] = att.status;
            });

            // Calculate statistics
            const totalLectures = lectures.length;
            const presentCount = attendanceRecords.filter(att => att.status === 'present').length;
            const absentCount = attendanceRecords.filter(att => att.status === 'absent').length;
            const markedLectures = attendanceRecords.length;
            const attendancePercentage = totalLectures > 0 ? ((presentCount / totalLectures) * 100).toFixed(2) : 0;

            // Build lecture details with attendance
            const lectureDetails = lectures.map(lecture => ({
                lectureId: lecture.id,
                lectureNumber: lecture.lectureNumber,
                lectureDate: lecture.lectureDate,
                topic: lecture.topic,
                status: attendanceMap[lecture.id] || null // null if not yet marked
            }));

            result.push({
                offeringId: offering.id,
                courseName: offering.course.name,
                courseCode: offering.course.code,
                sectionName: offering.section?.name,
                semesterName: offering.batch?.name,
                semester: offering.semester, // Added for filtering
                totalLectures,
                presentCount,
                absentCount,
                attendancePercentage: parseFloat(attendancePercentage),
                enrollmentStatus: enrollment.status, // Add status to differentiate current vs history
                lectures: lectureDetails
            });
        }

        return res.json({ success: true, data: result });
    } catch (error) {
        console.error('Get student attendance error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
});

// Get student's attendance for a specific offering
router.get('/attendance/student/:studentId/offering/:offeringId', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const studentId = Number.parseInt(req.params.studentId, 10);
        const offeringId = Number.parseInt(req.params.offeringId, 10);
        if (!Number.isInteger(studentId) || !Number.isInteger(offeringId)) {
            return res.status(400).json({ success: false, error: 'Invalid studentId or offeringId' });
        }

        const offering = await CourseOffering.findByPk(offeringId, { attributes: ['id', 'teacherId'] });
        if (!offering) return res.status(404).json({ success: false, error: 'Offering not found' });

        // Authorization check
        if (req.user.role === 'student') {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (!student || student.id !== studentId) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        } else if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
            if (!teacher || offering.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Access denied' });
            }
        }

        const enrollment = await StudentCourse.findOne({
            where: { studentId, courseOfferingId: offeringId, status: ['enrolled', 'completed', 'failed'] },
            attributes: ['id']
        });
        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'Student enrollment not found for this offering' });
        }

        // Get lectures for offering
        const lectures = await Lecture.findAll({
            where: { offeringId },
            order: [['lectureNumber', 'ASC']]
        });

        // Get attendance for this student (via Lecture join)
        const attendanceRecords = await Attendance.findAll({
            where: { studentId },
            include: [{
                model: Lecture,
                as: 'lecture',
                where: { offeringId },
                attributes: []
            }]
        });

        // Map attendance
        const attendanceMap = {};
        attendanceRecords.forEach(att => {
            attendanceMap[att.lectureId] = att.status;
        });

        const lectureDetails = lectures.map(lecture => ({
            lectureId: lecture.id,
            lectureNumber: lecture.lectureNumber,
            lectureDate: lecture.lectureDate,
            topic: lecture.topic,
            status: attendanceMap[lecture.id] || 'absent'
        }));

        const totalLectures = lectures.length;
        const presentCount = attendanceRecords.filter(att => att.status === 'present').length;
        const absentCount = attendanceRecords.filter(att => att.status === 'absent').length;
        const markedLectures = attendanceRecords.length;
        const attendancePercentage = totalLectures > 0 ? ((presentCount / totalLectures) * 100).toFixed(2) : 0;

        return res.json({
            success: true,
            data: {
                totalLectures,
                presentCount,
                absentCount,
                attendancePercentage: parseFloat(attendancePercentage),
                lectures: lectureDetails
            }
        });
    } catch (error) {
        console.error('Get offering attendance error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch attendance' });
    }
});

module.exports = router;

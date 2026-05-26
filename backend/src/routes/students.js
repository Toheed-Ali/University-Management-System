const express = require('express');
const { Student, User, Department, CourseOffering, Course, Teacher, Batch, Section, StudentCourse } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const Institution = require('../models/Institution');
const bcrypt = require('bcryptjs');
const { requireAuth, requireRole } = require('../middleware/auth');
const { sequelize } = require('../db');

const router = express.Router();

function getPagination(query) {
    const page = Number.parseInt(query.page, 10);
    const limit = Number.parseInt(query.limit, 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) return null;
    const safeLimit = Math.min(limit, 200);
    return { page, limit: safeLimit, offset: (page - 1) * safeLimit };
}

// Get all students
router.get('/students', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const pagination = getPagination(req.query);
        const queryOptions = {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code', 'totalCreditHours']
                },
                {
                    model: Batch,
                    as: 'batch',
                    attributes: ['id', 'name']
                },
                {
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'name']
                }
            ],
            order: [['createdAt', 'DESC']]
        };
        if (pagination) {
            queryOptions.limit = pagination.limit;
            queryOptions.offset = pagination.offset;
            const { rows, count } = await Student.findAndCountAll(queryOptions);
            return res.json({
                success: true,
                data: rows,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: count,
                    totalPages: Math.ceil(count / pagination.limit)
                }
            });
        }

        const students = await Student.findAll(queryOptions);
        return res.json({ success: true, data: students });
    } catch (error) {
        console.error('Get students error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
});

// Get current student profile (for logged-in student)
router.get('/students/me', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const student = await Student.findOne({
            where: { userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code', 'totalCreditHours']
                },
                {
                    model: Batch,
                    as: 'batch',
                    attributes: ['id', 'name']
                },
                {
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        return res.json({
            success: true,
            data: student
        });
    } catch (error) {
        console.error('Get student profile error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch student profile' });
    }
});

// Get enrolled courses for current student
router.get('/students/me/courses', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ success: false, error: 'Not authenticated' });
        }

        const student = await Student.findOne({ where: { userId } });

        if (!student) {
            return res.status(404).json({ success: false, error: 'Student profile not found' });
        }

        // Get manually enrolled courses (including pending and rejected)
        const enrolledCourses = await StudentCourse.findAll({
            where: {
                studentId: student.id,
                status: ['enrolled', 'pending', 'rejected']
            },
            include: [
                {
                    model: CourseOffering,
                    include: [
                        { model: Course, as: 'course' },
                        { model: Department, as: 'department' },
                        { model: Section, as: 'section' },
                        { model: Batch, as: 'batch' },
                        {
                            model: Teacher,
                            as: 'teacher',
                            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType'],
                            include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
                        }
                    ]
                }
            ]
        });

        // Transform to match frontend expectation
        const formatted = enrolledCourses.map(ec => {
            const offering = ec.CourseOffering;
            return {
                id: ec.id, // StudentCourse ID (for dropping)
                offeringId: offering.id,
                courseName: offering.course.name,
                courseCode: offering.course.code,
                credits: offering.course.credits,
                section: offering.section ? offering.section.name : 'A',
                sectionId: offering.sectionId,
                batch: offering.batch ? offering.batch.name : null,
                batchId: offering.batchId,
                departmentCode: offering.department ? offering.department.code : 'GEN',
                teacherName: offering.teacher ? `${offering.teacher.user.firstName} ${offering.teacher.user.lastName}` : 'TBA',
                semester: offering.semester,
                status: ec.status
            };
        });

        console.log(`Student ${student.id} enrollments:`, formatted.map(f => `${f.courseCode}:${f.status} (OffID: ${f.offeringId})`));

        return res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Get enrolled courses error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch enrolled courses' });
    }
});

// Get Student Transcript (SGPA/CGPA)
router.get('/students/me/transcript', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const student = await Student.findOne({
            where: { userId },
            include: [
                { model: User, as: 'user' },
                { model: Department, as: 'department' },
                { model: Batch, as: 'batch' },
                { model: Section, as: 'section' }
            ]
        });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        // Fetch all COMPLETED courses where result is APPROVED
        const completedCourses = await StudentCourse.findAll({
            where: {
                studentId: student.id,
            },
            include: [
                {
                    model: CourseOffering,
                    include: [
                        { model: Course, as: 'course' },
                        { model: Batch, as: 'batch' }
                    ]
                }
            ],
            order: [
                [{ model: CourseOffering }, 'semester', 'ASC']
            ]
        });

        // 1. Identify Best Attempts for CGPA Calculation
        const bestAttempts = {};
        completedCourses.forEach(record => {
            // ONLY count approved grades in CGPA
            if (record.CourseOffering.resultStatus !== 'approved') return;
            if (record.grade === 'W' || record.grade === 'I') return;

            const courseCode = record.CourseOffering.course.code;
            const points = parseFloat(record.gradePoints) || 0;
            const credits = parseFloat(record.CourseOffering.course.credits) || 0;

            // Initialize or update if better grade found
            if (!bestAttempts[courseCode] || points > bestAttempts[courseCode].points) {
                bestAttempts[courseCode] = {
                    points: points,
                    credits: credits,
                    grade: record.grade
                };
            }
        });

        // Calculate CGPA from Best Attempts
        let cgpaPoints = 0;
        let cgpaCredits = 0;

        Object.values(bestAttempts).forEach(attempt => {
            cgpaPoints += (attempt.credits * attempt.points);
            cgpaCredits += attempt.credits;
        });

        const cgpa = cgpaCredits > 0 ? (cgpaPoints / cgpaCredits).toFixed(2) : 0.00;

        // 2. Build Transcript Display (History)
        const transcript = {};
        completedCourses.forEach(record => {
            const sem = record.CourseOffering.semester;
            const credits = parseFloat(record.CourseOffering.course.credits) || 0;
            const isApproved = record.CourseOffering.resultStatus === 'approved';

            // If not approved, hide the actual grade/points from student
            const displayGrade = isApproved ? record.grade : 'Pending';
            const displayPoints = isApproved ? (parseFloat(record.gradePoints) || 0) : 0;

            if (!transcript[sem]) {
                transcript[sem] = {
                    semester: sem,
                    courses: [],
                    totalCredits: 0,
                    earnedPoints: 0,
                    sgpa: 0
                };
            }

            transcript[sem].courses.push({
                courseCode: record.CourseOffering.course.code,
                courseName: record.CourseOffering.course.name,
                credits: credits,
                grade: displayGrade,
                gradePoints: displayPoints,
                status: record.status,
                isApproved: isApproved
            });

            // Only update SGPA denominator and numerator if approved
            if (isApproved) {
                if (record.grade !== 'W' && record.grade !== 'I') {
                    transcript[sem].totalCredits += credits;
                    if (record.grade !== 'F') {
                        transcript[sem].earnedPoints += (credits * displayPoints);
                    }
                }
            }
        });

        // Calculate SGPA and reshape
        const semesters = Object.values(transcript).map(sem => {
            sem.sgpa = sem.totalCredits > 0 ? (sem.earnedPoints / sem.totalCredits).toFixed(2) : 0.00;
            return sem;
        });

        return res.json({
            success: true,
            data: {
                student: {
                    name: `${student.user?.firstName} ${student.user?.lastName}`,
                    rollNumber: student.rollNumber,
                    department: student.department?.name,
                    batch: student.batch?.name,
                    section: student.section?.name
                },
                cgpa,
                semesters: semesters.sort((a, b) => a.semester - b.semester)
            }
        });

    } catch (error) {
        console.error('Get transcript error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch transcript' });
    }
});

// Get available courses for registration
router.get('/students/me/available-courses', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const student = await Student.findOne({ where: { userId } });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        // --- REGISTRATION WINDOW CHECK ---
        const now = new Date();
        const inst = await Institution.findOne();

        // Global window
        let isGlobalOpen = false;
        if (inst && inst.registrationStartDate && inst.registrationEndDate) {
            isGlobalOpen = now >= new Date(inst.registrationStartDate) && now <= new Date(inst.registrationEndDate);
        }

        // Student override window
        let isStudentOverrideOpen = false;
        if (student.registrationStartDate && student.registrationEndDate) {
            isStudentOverrideOpen = now >= new Date(student.registrationStartDate) && now <= new Date(student.registrationEndDate);
        }

        // If both are closed, return empty with error or just empty
        if (!isGlobalOpen && !isStudentOverrideOpen) {
            return res.json({
                success: true,
                data: [],
                message: 'Registration window is currently closed.',
                isRegistrationOpen: false
            });
        }

        // Get all offerings for student's department and semester
        const allOfferings = await CourseOffering.findAll({
            where: {
                departmentId: student.departmentId,
                status: 'active'
            },
            include: [
                { model: Course, as: 'course' },
                { model: Department, as: 'department' },
                { model: Section, as: 'section' },
                { model: Batch, as: 'batch' },
                {
                    model: Teacher,
                    as: 'teacher',
                    attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType'],
                    include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }]
                }
            ]
        });

        // Get currently enrolled/pending/rejected offering IDs
        const enrolled = await StudentCourse.findAll({
            where: {
                studentId: student.id,
                status: ['enrolled', 'pending', 'rejected']
            },
            attributes: ['courseOfferingId']
        });
        const enrolledIds = enrolled.map(e => e.courseOfferingId);

        // Filter out enrolled courses
        const available = allOfferings.filter(offering => !enrolledIds.includes(offering.id));

        const formatted = available.map(offering => ({
            id: offering.id, // Offering ID (for adding)
            courseName: offering.course.name,
            courseCode: offering.course.code,
            credits: offering.course.credits,
            section: offering.section ? offering.section.name : 'A',
            sectionId: offering.sectionId,
            batch: offering.batch ? offering.batch.name : null,
            batchId: offering.batchId,
            departmentCode: offering.department ? offering.department.code : 'GEN',
            teacherName: offering.teacher ? `${offering.teacher.user.firstName} ${offering.teacher.user.lastName}` : 'TBA',
            semester: offering.semester
        }));

        return res.json({ success: true, data: formatted, isRegistrationOpen: true });
    } catch (error) {
        console.error('Get available courses error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch available courses' });
    }
});

// Add course (Enroll)
router.post('/students/me/courses', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { offeringId } = req.body;

        const student = await Student.findOne({ where: { userId } });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        const t = await sequelize.transaction();

        try {
            // Check Registration Dates (Institutional level)
            const [instRaw] = await sequelize.query('SELECT registrationStartDate, registrationEndDate FROM institution LIMIT 1', { transaction: t });
            const inst = instRaw[0];
            const now = new Date();

            let isGlobalOpen = false;
            if (inst && inst.registrationStartDate && inst.registrationEndDate) {
                isGlobalOpen = now >= new Date(inst.registrationStartDate) && now <= new Date(inst.registrationEndDate);
            }

            let isStudentOverrideOpen = false;

            // Re-fetch student inside transaction to get fresh dates
            const [studentRaw] = await sequelize.query('SELECT registrationStartDate, registrationEndDate, departmentId, id FROM students WHERE userId = :userId', {
                replacements: { userId }, transaction: t
            });
            const studentData = studentRaw[0];

            if (studentData && studentData.registrationStartDate && studentData.registrationEndDate) {
                isStudentOverrideOpen = now >= new Date(studentData.registrationStartDate) && now <= new Date(studentData.registrationEndDate);
            }

            if (!isGlobalOpen && !isStudentOverrideOpen) {
                await t.rollback();
                return res.status(403).json({ success: false, error: 'Registration is currently closed.' });
            }

            // Using transactionally scoped student definition going forward
            const currentStudentId = studentData.id;
            const currentStudentDept = studentData.departmentId;

            // Credit and Seat Checks
            // Get student's department max credits
            const [deptRaw] = await sequelize.query('SELECT maxCreditsPerSemester FROM departments WHERE id = :id', {
                replacements: { id: currentStudentDept },
                transaction: t
            });
            const maxCredits = deptRaw[0]?.maxCreditsPerSemester || 18;

            // Get offering details (credits and seats)
            const [offeringRaw] = await sequelize.query(`
                SELECT co.id, co.semester, c.credits, co.maxSeats, co.enrolledCount 
                FROM course_offerings co
                JOIN courses c ON co.courseId = c.id
                WHERE co.id = :id
                FOR UPDATE
            `, { replacements: { id: offeringId }, transaction: t });

            if (!offeringRaw || offeringRaw.length === 0) {
                await t.rollback();
                return res.status(404).json({ success: false, error: 'Course offering not found' });
            }
            const offering = offeringRaw[0];

            // Check seats available
            if (offering.enrolledCount >= offering.maxSeats) {
                await t.rollback();
                return res.status(400).json({ success: false, error: 'Course is full (No seats available).' });
            }

            // Get total credits for current semester
            const [currentCreditsRaw] = await sequelize.query(`
                SELECT IFNULL(SUM(c.credits), 0) as totalCredits
                FROM student_courses sc
                JOIN course_offerings co ON sc.courseOfferingId = co.id
                JOIN courses c ON co.courseId = c.id
                WHERE sc.studentId = :studentId AND co.semester = :semester AND sc.status IN ('enrolled', 'pending')
            `, { replacements: { studentId: currentStudentId, semester: offering.semester }, transaction: t });

            const currentCredits = parseFloat(currentCreditsRaw[0].totalCredits) || 0;
            const newCourseCredits = offering.credits || 0;

            // Confirm sum does not exceed max
            if (currentCredits + newCourseCredits > maxCredits) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Credit limit exceeded. Limit: ${maxCredits}, Current: ${currentCredits}, New: ${newCourseCredits}.`
                });
            }

            // Check if already enrolled
            const [existingRaw] = await sequelize.query(`
                SELECT id, status FROM student_courses 
                WHERE studentId = :studentId AND courseOfferingId = :offeringId
            `, { replacements: { studentId: currentStudentId, offeringId }, transaction: t });

            if (existingRaw.length > 0 && (existingRaw[0].status === 'enrolled' || existingRaw[0].status === 'pending')) {
                await t.rollback();
                return res.status(400).json({ success: false, error: 'Already enrolled or pending in this course' });
            }

            // Add entry in STUDENT_COURSES and set status to 'pending'
            if (existingRaw.length > 0) {
                await sequelize.query(`
                    UPDATE student_courses SET status = 'pending', enrollmentDate = NOW(), updatedAt = NOW() 
                    WHERE id = :id
                `, { replacements: { id: existingRaw[0].id }, transaction: t });
            } else {
                await sequelize.query(`
                    INSERT INTO student_courses (studentId, courseOfferingId, status, enrollmentDate, createdAt, updatedAt)
                    VALUES (:studentId, :offeringId, 'pending', NOW(), NOW(), NOW())
                `, { replacements: { studentId: currentStudentId, offeringId }, transaction: t });
            }

            await t.commit();

            return res.json({ success: true, message: 'Successfully requested enrollment (Pending approval)' });

        } catch (trxError) {
            if (t && !t.finished) await t.rollback();
            throw trxError;
        }

    } catch (error) {
        console.error('Add course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to enroll in course' });
    }
});

// Drop course
router.delete('/students/me/courses/:id', requireAuth, requireRole('student'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const offeringId = req.params.id; // API expects offeringId for drop too

        const student = await Student.findOne({ where: { userId } });
        if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

        const enrollment = await StudentCourse.findOne({
            where: {
                studentId: student.id,
                courseOfferingId: offeringId,
                status: ['enrolled', 'pending', 'rejected']
            }
        });

        if (!enrollment) {
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }

        // Hard delete the record for drop course.
        const t = await sequelize.transaction();
        try {
            if (enrollment.status === 'enrolled' || enrollment.status === 'pending') {
                const [offeringRaw] = await sequelize.query(
                    'SELECT c.credits FROM course_offerings co JOIN courses c ON co.courseId = c.id WHERE co.id = :id',
                    { replacements: { id: offeringId }, transaction: t }
                );
                const credits = offeringRaw[0]?.credits || 0;

                await sequelize.query(`
                    UPDATE students SET totalCredits = GREATEST(0, CAST(totalCredits AS SIGNED) - :credits), updatedAt = NOW() 
                    WHERE id = :id
                `, { replacements: { credits, id: student.id }, transaction: t });

                await sequelize.query(`
                    UPDATE course_offerings SET enrolledCount = GREATEST(0, CAST(enrolledCount AS SIGNED) - 1), updatedAt = NOW() 
                    WHERE id = :id
                `, { replacements: { id: offeringId }, transaction: t });
            }
            await enrollment.destroy({ transaction: t });
            await t.commit();
        } catch (err) {
            await t.rollback();
            throw err;
        }

        return res.json({ success: true, message: 'Successfully dropped course' });
    } catch (error) {
        console.error('Drop course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to drop course' });
    }
});

// Get statistics
router.get('/students/stats/overview', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { Op } = require('sequelize');

        const totalStudents = await Student.count();

        const activeStudents = await Student.count({
            include: [{
                model: User,
                as: 'user',
                where: { status: 'active' }
            }]
        });

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const recentStudents = await Student.count({
            where: {
                createdAt: { [Op.gte]: oneWeekAgo }
            }
        });

        return res.json({
            success: true,
            data: {
                totalStudents,
                activeStudents,
                recentStudents
            }
        });
    } catch (error) {
        console.error('Get student stats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch statistics' });
    }
});

// GET - Check if promotion is allowed
router.get('/students/promotion-status', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const pendingOfferingsCount = await CourseOffering.count({
            where: {
                status: 'active',
                resultStatus: {
                    [Op.ne]: 'approved'
                }
            }
        });

        return res.json({
            success: true,
            data: {
                canPromote: pendingOfferingsCount === 0,
                pendingCount: pendingOfferingsCount
            }
        });
    } catch (error) {
        console.error('Promotion status check error:', error);
        return res.status(500).json({ success: false, error: 'Failed to check promotion status' });
    }
});

// Move all students to next semester
router.post('/students/promote-semester', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        console.log('--- STARTING PHASE 1 TRANSACTION: SEMESTER PROMOTION ---');
        const t = await sequelize.transaction();

        try {
            // 1. Safety Check: Verify all active offerings have approved results
            const [pendingOfferings] = await sequelize.query(`
                SELECT COUNT(*) as count FROM course_offerings 
                WHERE status = 'active' AND resultStatus != 'approved'
            `, { transaction: t });
            const pendingCount = pendingOfferings[0].count;

            if (pendingCount > 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Cannot promote semester. There are ${pendingCount} active courses with pending grades.`
                });
            }

            // 2. Archive Current Offerings
            await sequelize.query("UPDATE course_offerings SET status = 'completed' WHERE status = 'active'", { transaction: t });

            // 3. Increment semester for active students (excluding graduated)
            await sequelize.query(`
                UPDATE students s
                JOIN users u ON s.userId = u.id
                SET s.semester = s.semester + 1, s.totalCredits = 0, s.updatedAt = NOW()
                WHERE u.status = 'active' AND s.semester < 8
            `, { transaction: t });

            // 4. Handle Graduation for Semester 8 Students
            await sequelize.query(`
                UPDATE users u
                JOIN students s ON u.id = s.userId
                JOIN departments d ON s.departmentId = d.id
                SET u.status = 'graduated', u.updatedAt = NOW()
                WHERE s.semester = 8 AND s.earnedCredits >= d.totalCreditHours AND u.status = 'active'
            `, { transaction: t });

            // 5. Archive StudentCourse records
            await sequelize.query(`
                UPDATE student_courses sc
                JOIN students s ON sc.studentId = s.id
                JOIN users u ON s.userId = u.id
                SET sc.status = 'completed', sc.updatedAt = NOW()
                WHERE sc.status = 'enrolled' AND u.status = 'active'
            `, { transaction: t });

            // 6. Reject pending StudentCourse records
            await sequelize.query(`
                UPDATE student_courses sc
                JOIN students s ON sc.studentId = s.id
                JOIN users u ON s.userId = u.id
                SET sc.status = 'rejected', sc.updatedAt = NOW()
                WHERE sc.status = 'pending' AND u.status = 'active'
            `, { transaction: t });

            // 7. Recalculate CGPA and earned credits for all active students 
            await sequelize.query(`
                UPDATE students s
                JOIN (
                    SELECT 
                        sc.studentId,
                        SUM(c.credits) as earned_credits,
                        SUM(c.credits * sc.gradePoints) / SUM(c.credits) as calc_cgpa
                    FROM student_courses sc
                    JOIN course_offerings co ON sc.courseOfferingId = co.id
                    JOIN courses c ON co.courseId = c.id
                    WHERE sc.status IN ('completed') AND sc.grade NOT IN ('W', 'I') AND co.resultStatus = 'approved'
                    GROUP BY sc.studentId
                ) grades ON s.id = grades.studentId
                JOIN users u ON s.userId = u.id
                SET s.earnedCredits = grades.earned_credits, s.cgpa = grades.calc_cgpa
                WHERE u.status = 'active'
            `, { transaction: t });

            await t.commit();
            console.log('--- PHASE 1 TRANSACTION COMMITTED: SEMESTER PROMOTION SUCCESS ---');

            return res.json({ success: true, message: 'Semester promotion completed successfully using raw SQL transactions.' });

        } catch (trxError) {
            console.error('--- PHASE 1 TRANSACTION FAILED: ROLLING BACK ---', trxError);
            if (t && !t.finished) await t.rollback();
            throw trxError;
        }

    } catch (error) {
        console.error('Promote semester error:', error);
        return res.status(500).json({ success: false, error: 'Failed to promote students to next semester' });
    }
});

// Move all students to previous semester
router.post('/students/demote-semester', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        // Get all active students in semester 2 or higher
        const activeStudents = await Student.findAll({
            where: {
                semester: {
                    [Op.gt]: 1 // Only semester 2+
                }
            },
            include: [{
                model: User,
                as: 'user',
                where: {
                    status: 'active' // Only active students
                },
                required: true
            }],
            attributes: ['id']
        });

        const studentIdsToDemote = activeStudents.map(s => s.id);

        // Decrement semester for eligible students only
        const result = await Student.update(
            {
                semester: sequelize.literal('semester - 1')
            },
            {
                where: {
                    id: {
                        [Op.in]: studentIdsToDemote
                    }
                }
            }
        );

        const demotedCount = result[0];

        return res.json({
            success: true,
            message: `Successfully moved ${demotedCount} student(s) to the previous semester`,
            data: { count: demotedCount }
        });
    } catch (error) {
        console.error('Demote semester error:', error);
        return res.status(500).json({ success: false, error: 'Failed to move students to previous semester' });
    }
});

// Get single student
router.get('/students/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
    try {
        const student = await Student.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status']
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code', 'totalCreditHours']
                },
                {
                    model: Batch,
                    as: 'batch',
                    attributes: ['id', 'name']
                },
                {
                    model: Section,
                    as: 'section',
                    attributes: ['id', 'name']
                }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        // OWNERSHIP CHECK: If user is teacher, verify student is in one of their offerings
        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher profile not found' });

            const enrollmentCount = await StudentCourse.count({
                include: [{
                    model: CourseOffering,
                    where: { teacherId: teacher.id }
                }],
                where: { studentId: student.id }
            });

            if (enrollmentCount === 0) {
                return res.status(403).json({ success: false, error: 'Access denied: This student is not in any of your courses.' });
            }
        }

        return res.json({ success: true, data: student });
    } catch (error) {
        console.error('Get student error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch student' });
    }
});

// Create new student
router.post('/students', requireAuth, requireRole('admin'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { user, student } = req.body;

        if (!user?.email || !user?.password) {
            if (!t.finished) await t.rollback();
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check if email exists
        const existingUser = await User.findOne({ where: { email: user.email.toLowerCase() }, transaction: t });
        if (existingUser) {
            if (!t.finished) await t.rollback();
            return res.status(409).json({ success: false, error: 'Email already exists' });
        }

        // Check if rollNumber exists
        const existingRollNumber = await Student.findOne({ where: { rollNumber: student.rollNumber }, transaction: t });
        if (existingRollNumber) {
            if (!t.finished) await t.rollback();
            return res.status(409).json({ success: false, error: 'Roll Number already exists' });
        }

        // Check if cnic exists (if provided)
        if (student.cnic) {
            const existingCNIC = await Student.findOne({ where: { cnic: student.cnic }, transaction: t });
            if (existingCNIC) {
                if (!t.finished) await t.rollback();
                return res.status(409).json({ success: false, error: 'CNIC Number already exists' });
            }
        }

        // We don't need department totalCreditHours for totalCredits anymore, it starts at 0.
        // It keeps track of currently enrolled course credits.
        const passwordHash = await bcrypt.hash(user.password, 12);

        // Validate dateOfBirth is in the past
        if (student.dateOfBirth && new Date(student.dateOfBirth) >= new Date()) {
            if (t && !t.finished) await t.rollback();
            return res.status(400).json({ success: false, error: 'Date of birth must be in the past' });
        }

        // 1. Insert User
        const [userResult] = await sequelize.query(`
            INSERT INTO users (firstName, lastName, email, passwordHash, role, status, createdAt, updatedAt)
            VALUES (:firstName, :lastName, :email, :passwordHash, :role, :status, NOW(), NOW())
        `, {
            replacements: {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email.toLowerCase(),
                passwordHash,
                role: 'student',
                status: 'active'
            },
            type: QueryTypes.INSERT,
            transaction: t
        });

        // userResult is the newly inserted ID
        const newlyInsertedUserId = userResult;

        // 2. Insert Student Profile
        const [studentResult] = await sequelize.query(`
            INSERT INTO students (
                userId, rollNumber, batchId, departmentId, sectionId, 
                semester, cgpa, totalCredits, earnedCredits, dateOfBirth, gender, 
                nationality, religion, fatherName, cnic, phone, 
                createdAt, updatedAt
            )
            VALUES (
                :userId, :rollNumber, :batchId, :departmentId, :sectionId, 
                :semester, :cgpa, :totalCredits, 0, :dateOfBirth, :gender, 
                :nationality, :religion, :fatherName, :cnic, :phone, 
                NOW(), NOW()
            )
        `, {
            replacements: {
                userId: newlyInsertedUserId,
                rollNumber: student.rollNumber,
                batchId: student.batchId || null,
                departmentId: student.departmentId || null,
                sectionId: student.sectionId || null,
                semester: student.semester || 1,
                cgpa: 0.00,
                totalCredits: 0,
                dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : null,
                gender: student.gender || null,
                nationality: student.nationality || null,
                religion: student.religion || null,
                fatherName: student.fatherName || null,
                cnic: student.cnic || null,
                phone: student.phone || null
            },
            type: QueryTypes.INSERT,
            transaction: t
        });

        const newlyInsertedStudentId = studentResult;

        // Commit transaction explicitly
        await t.commit();

        // Fetch complete student data formatting
        const completeStudent = await Student.findByPk(newlyInsertedStudentId, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] },
                { model: Department, as: 'department', attributes: ['id', 'name', 'code', 'totalCreditHours'] },
                { model: Batch, as: 'batch', attributes: ['id', 'name'] },
                { model: Section, as: 'section', attributes: ['id', 'name'] }
            ]
        });

        return res.status(201).json({ success: true, data: completeStudent });
    } catch (error) {
        if (!t.finished) await t.rollback();

        console.error('Create student error:', error);

        // Handle unique constraint manually for raw SQL
        if (error.original && error.original.code === 'ER_DUP_ENTRY') {
            const message = error.original.sqlMessage.includes('rollNumber')
                ? 'Roll Number already exists'
                : 'A unique constraint was violated';
            return res.status(409).json({ success: false, error: message });
        }

        return res.status(500).json({ success: false, error: 'Failed to create student' });
    }
});

// Update student
router.put('/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const student = await Student.findByPk(req.params.id);

        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        const { user, student: studentData } = req.body;

        // Update user if provided
        if (user) {
            const userRecord = await User.findByPk(student.userId);
            const updateData = {
                firstName: user.firstName || userRecord.firstName,
                lastName: user.lastName || userRecord.lastName,
                status: user.status || userRecord.status
            };

            if (user.password) {
                updateData.passwordHash = await bcrypt.hash(user.password, 12);
                // Increment tokenVersion to invalidate existing sessions
                updateData.tokenVersion = userRecord.tokenVersion + 1;
            }

            await userRecord.update(updateData);
        }

        // If department is changing, update total credits
        if (studentData?.departmentId && studentData.departmentId !== student.departmentId) {
            const department = await Department.findByPk(studentData.departmentId);
            if (department) {
                studentData.totalCredits = department.totalCreditHours;
            }
        }

        // Update student if data provided
        if (studentData) {
            await student.update(studentData);
        }

        // Fetch updated student
        const updatedStudent = await Student.findByPk(req.params.id, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] },
                { model: Department, as: 'department', attributes: ['id', 'name', 'code', 'totalCreditHours'] },
                { model: Batch, as: 'batch', attributes: ['id', 'name'] },
                { model: Section, as: 'section', attributes: ['id', 'name'] }
            ]
        });

        return res.json({ success: true, data: updatedStudent });
    } catch (error) {
        console.error('Update student error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update student' });
    }
});

// Delete student
router.delete('/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const t = await require('../db').sequelize.transaction();
    try {
        const student = await Student.findByPk(req.params.id);

        if (!student) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Student not found' });
        }

        // Delete student first (to remove FK reference to user)
        const userId = student.userId;
        await student.destroy({ transaction: t });

        // Then delete user
        if (userId) {
            await User.destroy({ where: { id: userId }, transaction: t });
        }

        await t.commit();
        return res.json({ success: true, message: 'Student and associated user deleted successfully' });
    } catch (error) {
        if (t) await t.rollback();
        console.error('Delete student error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete student' });
    }
});


module.exports = router;

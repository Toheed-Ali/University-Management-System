const express = require('express');
const { Op, QueryTypes } = require('sequelize');
const { Teacher, User, Course, CourseOffering, StudentCourse, Student, Section, Batch, Department, Assignment, AssignmentSubmission } = require('../models');
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

// Get all teachers
router.get('/teachers', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const isAdmin = req.user.role === 'admin';
        const publicAttributes = ['id', 'userId', 'employeeId', 'gender', 'nationality', 'employmentType', 'createdAt', 'updatedAt'];
        const adminAttributes = [...publicAttributes, 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'religion'];

        const pagination = getPagination(req.query);
        const queryOptions = {
            distinct: true,
            attributes: isAdmin ? adminAttributes : publicAttributes,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status']
                },
                {
                    model: require('../models').CourseOffering,
                    as: 'offerings',
                    include: [{
                        model: Course,
                        as: 'course',
                        attributes: ['id', 'name', 'code']
                    }]
                }
            ],
            order: [
                [{ model: User, as: 'user' }, 'firstName', 'ASC'],
                [{ model: User, as: 'user' }, 'lastName', 'ASC']
            ]
        };
        if (pagination) {
            queryOptions.limit = pagination.limit;
            queryOptions.offset = pagination.offset;
        }
        const queryResult = pagination ? await Teacher.findAndCountAll(queryOptions) : { rows: await Teacher.findAll(queryOptions), count: null };
        const teachers = queryResult.rows;

        // Merge courses from M:N relationship AND active offerings
        const formattedTeachers = teachers.map(teacher => {
            const t = teacher.toJSON();

            // Extract courses from offerings (Filter out those where results are already approved)
            const offeredCourses = t.offerings 
                ? t.offerings.filter(o => o.resultStatus !== 'approved').map(o => o.course).filter(c => c) 
                : [];

            const allCourses = [...offeredCourses];

            // Deduplicate by ID
            const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values());

            t.courses = uniqueCourses;
            delete t.offerings; // Clean up response
            return t;
        });

        if (pagination) {
            return res.json({
                success: true,
                data: formattedTeachers,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: queryResult.count,
                    totalPages: Math.ceil(queryResult.count / pagination.limit)
                }
            });
        }
        return res.json({ success: true, data: formattedTeachers });
    } catch (error) {
        console.error('Get teachers error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch teachers' });
    }
});


// --- Teacher Portal Endpoints ---

// Get teacher notifications
router.get('/teachers/notifications', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            where: { userId: req.user.id }
        });

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        const rejectedCount = await CourseOffering.count({
            where: {
                teacherId: teacher.id,
                resultStatus: 'rejected'
            }
        });

        const fiveDaysAgo = new Date();
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

        const recentlyApproved = await CourseOffering.findAll({
            where: {
                teacherId: teacher.id,
                resultStatus: 'approved',
                updatedAt: { [Op.gte]: fiveDaysAgo }
            },
            include: [
                { model: Course, as: 'course', attributes: ['name', 'code'] },
                { model: Section, as: 'section', attributes: ['name'] }
            ]
        });

        return res.json({ success: true, data: { rejectedCount, recentlyApproved } });
    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
    }
});

// Get teacher dashboard statistics
router.get('/teachers/dashboard-stats', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
        if (!teacher) return res.status(404).json({ success: false, error: 'Teacher not found' });

        // 1. Total Courses (Assigned Offerings)
        const totalCourses = await CourseOffering.count({ where: { teacherId: teacher.id } });

        // 2. Total Students (Distinct)
        const enrollments = await StudentCourse.findAll({
            where: { status: 'enrolled' },
            include: [{
                model: CourseOffering,
                where: { teacherId: teacher.id },
                attributes: []
            }],
            attributes: ['studentId']
        });
        const distinctStudentIds = new Set(enrollments.map(e => e.studentId));
        const totalStudentsCount = distinctStudentIds.size;

        // 3. Pending Results
        const pendingResults = await CourseOffering.count({
            where: {
                teacherId: teacher.id,
                resultStatus: { [Op.in]: ['pending', 'rejected'] }
            }
        });

        // 4. Pending Assignments (Submitted but not graded)
        const pendingAssignments = await AssignmentSubmission.count({
            where: { status: 'submitted' },
            include: [{
                model: Assignment,
                as: 'assignment',
                required: true,
                include: [{
                    model: CourseOffering,
                    as: 'offering',
                    where: { teacherId: teacher.id },
                    required: true
                }]
            }]
        });

        return res.json({
            success: true,
            data: {
                totalCourses,
                totalStudents: totalStudentsCount,
                pendingResults,
                pendingAssignments
            }
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
});

// Get teacher profile
router.get('/teachers/profile', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id },
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
        });

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        return res.json({ success: true, data: teacher });
    } catch (error) {
        console.error('Get teacher profile error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Get assigned offerings
router.get('/teachers/offerings', requireAuth, requireRole('teacher'), async (req, res) => {
    console.log(`[DEBUG] GET /teachers/offerings - User ID: ${req.user.id}`);
    try {
        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        const offerings = await CourseOffering.findAll({
            where: {
                teacherId: teacher.id,
                resultStatus: { [Op.ne]: 'approved' }
            },
            include: [
                { model: Course, as: 'course', attributes: ['id', 'name', 'code'] },
                { model: Section, as: 'section', attributes: ['id', 'name'] },
                { model: Batch, as: 'batch', attributes: ['id', 'name', 'year'] }
            ]
        });

        // Add enrollment counts
        const offeringsWithCounts = await Promise.all(offerings.map(async (offering) => {
            const count = await StudentCourse.count({
                where: { courseOfferingId: offering.id, status: 'enrolled' }
            });
            const data = offering.toJSON();
            data.enrolledCount = count;
            data.courseName = data.course?.name;
            data.courseCode = data.course?.code;
            data.sectionName = data.section?.name;
            data.semesterName = data.batch?.name;
            data.academicYear = data.batch?.year; // Map year to academicYear for frontend
            return data;
        }));

        return res.json({ success: true, data: offeringsWithCounts });
    } catch (error) {
        console.error('[DEBUG] Get teacher offerings error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Get students enrolled in an offering
router.get('/teachers/offerings/:offeringId/students', requireAuth, requireRole('teacher'), async (req, res) => {
    console.log(`[DEBUG] GET /teachers/offerings/${req.params.offeringId}/students - User ID: ${req.user.id}`);
    try {
        const teacher = await Teacher.findOne({
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            where: { userId: req.user.id }
        });
        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher profile not found' });
        }

        const offering = await CourseOffering.findOne({
            where: { id: req.params.offeringId, teacherId: teacher.id }
        });

        if (!offering) {
            console.warn(`[DEBUG] Offering ${req.params.offeringId} not found or not assigned to teacher ${teacher.id}`);
            return res.status(403).json({ success: false, error: 'Access denied or offering not found' });
        }

        const enrollments = await StudentCourse.findAll({
            where: {
                courseOfferingId: req.params.offeringId,
                status: 'enrolled' // Only show currently enrolled (active) students to teacher
            },
            include: [
                {
                    model: Student,
                    include: [
                        { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }
                    ]
                }
            ],
            order: [
                [{ model: Student }, 'rollNumber', 'ASC']
            ]
        });

        // Convert to plain objects and normalize student case for frontend convenience
        // Also calculate attendance percentage for each student
        const formatted = await Promise.all(enrollments.map(async (e) => {
            const plain = e.get({ plain: true });
            if (plain.Student) {
                plain.student = plain.Student;
                delete plain.Student;
            }

            // Calculate attendance
            try {
                const totalLectures = await require('../models').Lecture.count({
                    where: { offeringId: req.params.offeringId }
                });

                const presentCount = await require('../models').Attendance.count({
                    distinct: true,
                    col: 'lectureId',
                    where: {
                        studentId: plain.studentId,
                        status: 'present'
                    },
                    include: [{
                        model: require('../models').Lecture,
                        as: 'lecture',
                        where: { offeringId: req.params.offeringId }
                    }]
                });

                plain.attendancePercentage = totalLectures > 0 ? (presentCount / totalLectures) * 100 : 0;
            } catch (err) {
                console.error(`Error calculating attendance for student ${plain.studentId}:`, err);
                plain.attendancePercentage = 0;
            }

            return plain;
        }));

        console.log(`[DEBUG] Found ${formatted.length} students for offering ${req.params.offeringId}`);
        return res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('[DEBUG] Get offering students error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Submit results
router.post('/teachers/offerings/:offeringId/results', requireAuth, requireRole('teacher'), async (req, res) => {
    try {
        const teacher = await Teacher.findOne({
            attributes: ['id'],
            where: { userId: req.user.id }
        });
        const offering = await CourseOffering.findOne({
            where: { id: req.params.offeringId, teacherId: teacher.id }
        });

        if (!offering) {
            return res.status(403).json({ success: false, error: 'Access denied or offering not found' });
        }

        // Prevent modification if already submitted or approved, unless rejected
        if (offering.resultStatus === 'submitted' || offering.resultStatus === 'approved') {
            return res.status(403).json({ success: false, error: 'Results already submitted. Please contact admin if changes are needed.' });
        }

        const { results } = req.body;
        if (!Array.isArray(results)) {
            return res.status(400).json({ success: false, error: 'Invalid results data' });
        }

        const GRADE_POINTS = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'C-': 1.7,
            'D+': 1.3, 'D': 1.0, 'D-': 0.7,
            'F': 0.0, 'P': 0.0
        };

        console.log(`[DEBUG] Received results submission for offering ${req.params.offeringId}. Payload size: ${results.length}`);

        let updatedCount = 0;
        let failedCount = 0;

        for (const resData of results) {
            const gradePoints = GRADE_POINTS[resData.grade] || 0.0;

            const [affectedRows] = await StudentCourse.update({
                grade: resData.grade,
                gradePoints: gradePoints
                // Status remains 'enrolled' until Admin Approves
            }, {
                where: {
                    id: resData.enrollmentId,
                    courseOfferingId: req.params.offeringId
                }
            });

            if (affectedRows > 0) {
                updatedCount++;
            } else {
                console.warn(`[DEBUG] Failed to update enrollment ${resData.enrollmentId}. Row not found or unchanged.`);
                failedCount++;
            }
        }

        console.log(`[DEBUG] Submission complete. Updated: ${updatedCount}, Failed/Unchanged: ${failedCount}`);

        // Update offering status
        await offering.update({
            resultStatus: 'submitted',
            submittedAt: new Date()
        });

        return res.json({ success: true, message: 'Results submitted successfully' });
    } catch (error) {
        console.error('Submit results error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// Get single teacher
router.get('/teachers/:id', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    console.log(`[DEBUG] GET /teachers/:id - ID Param: ${req.params.id}`);
    try {
        const isAdmin = req.user.role === 'admin';
        const isSelf = req.user.role === 'teacher'; // If they hit this, profile logic usually handles /profile, but /:id might be used.
        const publicAttributes = ['id', 'userId', 'employeeId', 'gender', 'nationality', 'employmentType', 'createdAt', 'updatedAt'];
        const adminAttributes = [...publicAttributes, 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'religion'];

        const teacher = await Teacher.findByPk(req.params.id, {
            attributes: isAdmin ? adminAttributes : publicAttributes,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'firstName', 'lastName', 'email', 'status']
                }
            ]
        });

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        return res.json({ success: true, data: teacher });
    } catch (error) {
        console.error('Get teacher error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch teacher' });
    }
});

// Create new teacher
router.post('/teachers', requireAuth, requireRole('admin'), async (req, res) => {
    // Standardizing on raw SQL for transaction management requirement
    const t = await sequelize.transaction();
    try {
        const { user, teacher } = req.body;

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

        // Check if employeeId exists (if provided)
        if (teacher.employeeId) {
            const existingEmployeeId = await Teacher.findOne({ where: { employeeId: teacher.employeeId }, transaction: t });
            if (existingEmployeeId) {
                if (!t.finished) await t.rollback();
                return res.status(409).json({ success: false, error: 'Employee ID already exists' });
            }
        }

        // Check if cnic exists (if provided)
        if (teacher.cnic) {
            const existingCNIC = await Teacher.findOne({ where: { cnic: teacher.cnic }, transaction: t });
            if (existingCNIC) {
                if (!t.finished) await t.rollback();
                return res.status(409).json({ success: false, error: 'CNIC Number already exists' });
            }
        }

        const passwordHash = await bcrypt.hash(user.password, 12);

        // Validate dateOfBirth is in the past
        if (teacher.dateOfBirth && new Date(teacher.dateOfBirth) >= new Date()) {
            if (t && !t.finished) await t.rollback();
            return res.status(400).json({ success: false, error: 'Date of birth must be in the past' });
        }

        // ---------------------------------------------------------
        // RAW SQL TRANSACTION START (MANAGED)
        // ---------------------------------------------------------

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
                role: 'teacher',
                status: 'active'
            },
            type: QueryTypes.INSERT,
            transaction: t
        });

        const newlyInsertedUserId = userResult;

        // 2. Insert Teacher Profile
        const [teacherResult] = await sequelize.query(`
            INSERT INTO teachers (
                userId, employeeId, phone, cnic, dateOfBirth, joiningDate, gender,
                nationality, religion, employmentType, createdAt, updatedAt
            )
            VALUES (
                :userId, :employeeId, :phone, :cnic, :dateOfBirth, :joiningDate, :gender,
                :nationality, :religion, :employmentType, NOW(), NOW()
            )
        `, {
            replacements: {
                userId: newlyInsertedUserId,
                employeeId: teacher.employeeId || null,
                phone: teacher.phone || null,
                cnic: teacher.cnic || null,
                dateOfBirth: teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toISOString().split('T')[0] : null,
                joiningDate: teacher.joiningDate ? new Date(teacher.joiningDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                gender: teacher.gender || null,
                nationality: teacher.nationality || null,
                religion: teacher.religion || null,
                employmentType: teacher.employmentType || null
            },
            type: QueryTypes.INSERT,
            transaction: t
        });

        const newlyInsertedTeacherId = teacherResult;

        // Commit transaction explicitly
        await t.commit();
        // ---------------------------------------------------------
        // RAW SQL TRANSACTION END
        // ---------------------------------------------------------

        // Fetch complete teacher data
        const completeTeacher = await Teacher.findByPk(newlyInsertedTeacherId, {
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] }
            ]
        });

        return res.status(201).json({ success: true, data: completeTeacher });
    } catch (error) {
        if (t && !t.finished) await t.rollback();

        console.error('Create teacher error:', error);

        // Handle unique constraint manually for raw SQL
        if (error.original && error.original.code === 'ER_DUP_ENTRY') {
            const message = error.original.sqlMessage.includes('employeeId')
                ? 'Employee ID already exists'
                : 'A unique constraint was violated';
            return res.status(409).json({ success: false, error: message });
        }

        return res.status(500).json({ success: false, error: 'Failed to create teacher' });
    }
});

// Update teacher
router.put('/teachers/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        const { user, teacher: teacherData } = req.body;

        // Update user if provided
        if (user) {
            const userRecord = await User.findByPk(teacher.userId);
            const updateData = {
                firstName: user.firstName || userRecord.firstName,
                lastName: user.lastName || userRecord.lastName,
                status: user.status || userRecord.status
            };

            if (user.password) {
                updateData.passwordHash = await bcrypt.hash(user.password, 12);
                updateData.tokenVersion = userRecord.tokenVersion + 1; // Invalidate sessions
            }

            await userRecord.update(updateData);
        }

        // Update teacher
        await teacher.update(teacherData);


        // Fetch updated teacher
        const updatedTeacher = await Teacher.findByPk(req.params.id, {
            attributes: ['id', 'userId', 'employeeId', 'phone', 'cnic', 'dateOfBirth', 'joiningDate', 'gender', 'nationality', 'religion', 'employmentType', 'createdAt', 'updatedAt'],
            include: [
                { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'status'] }
            ]
        });

        return res.json({ success: true, data: updatedTeacher });
    } catch (error) {
        console.error('Update teacher error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update teacher' });
    }
});

// Delete teacher
router.delete('/teachers/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const teacher = await Teacher.findByPk(req.params.id);

        if (!teacher) {
            return res.status(404).json({ success: false, error: 'Teacher not found' });
        }

        // Delete user (this will cascade to teacher)
        await User.destroy({ where: { id: teacher.userId } });
        await teacher.destroy();

        return res.json({ success: true, message: 'Teacher deleted successfully' });
    } catch (error) {
        console.error('Delete teacher error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete teacher' });
    }
});


module.exports = router;

const express = require('express');
const { CourseOffering, Course, Teacher, Department, User, Batch, Section, StudentCourse, Student, Lecture, Attendance, Assignment, AssignmentSubmission } = require('../models');
const { sequelize } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const router = express.Router();

function getPagination(query) {
    const page = Number.parseInt(query.page, 10);
    const limit = Number.parseInt(query.limit, 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) return null;
    const safeLimit = Math.min(limit, 200);
    return { page, limit: safeLimit, offset: (page - 1) * safeLimit };
}

// Get all offerings (with optional filters)
router.get('/', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const { departmentId, semester, batchId, sectionId } = req.query;

        const whereClause = {};
        if (departmentId) whereClause.departmentId = departmentId;
        if (semester) whereClause.semester = semester;
        if (batchId) whereClause.batchId = batchId;
        if (sectionId) whereClause.sectionId = sectionId;
        if (req.query.courseId) whereClause.courseId = req.query.courseId;

        const pagination = getPagination(req.query);
        const queryOptions = {
            where: whereClause,
            include: [
                {
                    model: Course,
                    as: 'course',
                    attributes: ['id', 'name', 'code', 'credits']
                },
                {
                    model: Teacher,
                    as: 'teacher',
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'firstName', 'lastName']
                    }]
                },
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code', 'maxCreditsPerSemester']
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
            order: [
                ['departmentId', 'ASC'],
                ['semester', 'ASC'],
                ['courseId', 'ASC']
            ]
        };
        if (pagination) {
            queryOptions.limit = pagination.limit;
            queryOptions.offset = pagination.offset;
            queryOptions.distinct = true;
        }
        const queryResult = pagination ? await CourseOffering.findAndCountAll(queryOptions) : { rows: await CourseOffering.findAll(queryOptions), count: null };
        const offerings = queryResult.rows;

        const offeringIds = offerings.map((o) => o.id);
        const pendingRows = offeringIds.length > 0
            ? await StudentCourse.findAll({
                where: { courseOfferingId: offeringIds, status: 'pending' },
                attributes: ['courseOfferingId', [sequelize.fn('COUNT', sequelize.col('id')), 'pendingCount']],
                group: ['courseOfferingId'],
                raw: true
            })
            : [];
        const pendingCountMap = pendingRows.reduce((acc, row) => {
            acc[row.courseOfferingId] = Number.parseInt(row.pendingCount, 10) || 0;
            return acc;
        }, {});

        const offeringsData = offerings.map((o) => {
            const pendingCount = pendingCountMap[o.id] || 0;

            return {
                id: o.id,
                courseId: o.courseId,
                courseName: o.course?.name,
                courseCode: o.course?.code,
                credits: o.course?.credits,
                departmentId: o.departmentId,
                departmentName: o.department?.name,
                maxCredits: o.department?.maxCreditsPerSemester || 18,
                teacherId: o.teacherId,
                teacherName: o.teacher?.user ? `${o.teacher.user.firstName} ${o.teacher.user.lastName}` : 'Unassigned',
                semester: o.semester,
                batchId: o.batchId,
                batchName: o.batch?.name,
                sectionId: o.sectionId,
                sectionName: o.section?.name,
                status: o.status,
                resultStatus: o.resultStatus,
                enrolledCount: o.enrolledCount || 0,
                pendingCount
            };
        });

        if (pagination) {
            return res.json({
                success: true,
                data: offeringsData,
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: queryResult.count,
                    totalPages: Math.ceil(queryResult.count / pagination.limit)
                }
            });
        }

        return res.json({ success: true, data: offeringsData });
    } catch (error) {
        console.error('Get offerings error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch course offerings' });
    }
});

// Create new offering
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { courseId, departmentId, teacherId, semester, batchId, sectionId } = req.body;

        if (!courseId || !departmentId || !semester || !batchId || !sectionId) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check for duplicate offering (same course, batch, section, semester)
        const existingOffering = await CourseOffering.findOne({
            where: {
                courseId,
                departmentId,
                semester,
                batchId,
                sectionId
            }
        });

        if (existingOffering) {
            return res.status(409).json({ success: false, error: 'This course is already offered to this section for the selected semester.' });
        }

        const newOffering = await CourseOffering.create({
            courseId,
            departmentId,
            teacherId: teacherId || null,
            semester,
            batchId,
            sectionId,
            status: 'active'
        });

        return res.status(201).json({ success: true, data: newOffering });
    } catch (error) {
        console.error('Create offering error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create course offering' });
    }
});

// Get single offering
router.get('/:id', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
    try {
        const offering = await CourseOffering.findByPk(req.params.id, {
            include: [
                { model: Course, as: 'course' },
                {
                    model: Teacher,
                    as: 'teacher',
                    include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
                },
                { model: Department, as: 'department' },
                { model: Batch, as: 'batch' },
                { model: Section, as: 'section' }
            ]
        });

        if (!offering) {
            return res.status(404).json({ success: false, error: 'Offering not found' });
        }
        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
            if (!teacher || offering.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Access denied: you are not assigned to this offering.' });
            }
        }

        const teacherUser = offering.teacher && offering.teacher.user ? offering.teacher.user : null;

        const flatOffering = {
            id: offering.id,
            courseId: offering.courseId,
            courseName: offering.course?.name,
            courseCode: offering.course?.code,
            departmentId: offering.departmentId,
            departmentName: offering.department?.name,
            teacherId: offering.teacherId,
            teacherName: teacherUser ? `${teacherUser.firstName} ${teacherUser.lastName}` : 'Unassigned',
            teacherEmail: teacherUser ? teacherUser.email : null,
            semester: offering.semester,
            batchId: offering.batchId,
            batchName: offering.batch?.name,
            sectionId: offering.sectionId,
            sectionName: offering.section?.name,
            status: offering.status,
            resultStatus: offering.resultStatus
        };

        return res.json({ success: true, data: flatOffering });
    } catch (error) {
        console.error('Get offering error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch offering' });
    }
});

// Update offering
router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { teacherId, status, semester, batchId, sectionId } = req.body;
        const offering = await CourseOffering.findByPk(req.params.id);

        if (!offering) {
            return res.status(404).json({ success: false, error: 'Offering not found' });
        }

        // Check for duplicate offering (same course, batch, section, semester) - exclude current offering
        const checkSemester = semester !== undefined ? semester : offering.semester;
        const checkBatchId = batchId !== undefined ? batchId : offering.batchId;
        const checkSectionId = sectionId !== undefined ? sectionId : offering.sectionId;

        const { Op } = require('sequelize');
        const existingOffering = await CourseOffering.findOne({
            where: {
                courseId: offering.courseId,
                departmentId: offering.departmentId,
                semester: checkSemester,
                batchId: checkBatchId,
                sectionId: checkSectionId,
                id: { [Op.ne]: offering.id } // Exclude current offering
            }
        });

        if (existingOffering) {
            return res.status(409).json({ success: false, error: 'This course is already offered to this section for the selected semester.' });
        }

        await offering.update({
            teacherId,
            status,
            semester,
            batchId,
            sectionId
        });

        return res.json({ success: true, data: offering });
    } catch (error) {
        console.error('Update offering error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update course offering' });
    }
});

// Delete offering
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const offeringId = req.params.id;
        const offering = await CourseOffering.findByPk(offeringId, { transaction: t });

        if (!offering) {
            await t.rollback();
            return res.status(404).json({ success: false, error: 'Offering not found' });
        }

        // 1. Delete Attendances related to lectures of this offering
        const lectures = await Lecture.findAll({ where: { offeringId }, transaction: t });
        const lectureIds = lectures.map(l => l.id);
        if (lectureIds.length > 0) {
            await Attendance.destroy({ where: { lectureId: lectureIds }, transaction: t });
        }

        // 2. Delete Lectures
        await Lecture.destroy({ where: { offeringId }, transaction: t });

        // 3. Delete Assignment Submissions related to assignments of this offering
        const assignments = await Assignment.findAll({ where: { courseOfferingId: offeringId }, transaction: t });
        const assignmentIds = assignments.map(a => a.id);
        if (assignmentIds.length > 0) {
            await AssignmentSubmission.destroy({ where: { assignmentId: assignmentIds }, transaction: t });
        }

        // 4. Delete Assignments
        await Assignment.destroy({ where: { courseOfferingId: offeringId }, transaction: t });

        // 5. Delete Student Enrollments (StudentCourse)
        // Also need to decrement Student.totalCredits if they were enrolled
        const enrollments = await StudentCourse.findAll({ 
            where: { courseOfferingId: offeringId, status: 'enrolled' },
            include: [{ model: CourseOffering, include: [{ model: Course, as: 'course' }] }],
            transaction: t 
        });

        for (const enrollment of enrollments) {
            const credits = enrollment.CourseOffering?.course?.credits || 0;
            const student = await Student.findByPk(enrollment.studentId, { transaction: t });
            if (student && student.totalCredits >= credits) {
                await student.decrement('totalCredits', { by: credits, transaction: t });
            } else if (student) {
                await student.update({ totalCredits: 0 }, { transaction: t });
            }
        }

        await StudentCourse.destroy({ where: { courseOfferingId: offeringId }, transaction: t });

        // 6. Finally delete the offering
        await offering.destroy({ transaction: t });

        await t.commit();
        return res.json({ success: true, message: 'Offering and all related data deleted successfully' });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('Delete offering error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete course offering. Ensure no critical data dependencies exist.' });
    }
});


// Get students for a specific offering
router.get('/:id/students', requireAuth, requireRole('admin', 'teacher'), async (req, res) => {
    try {
        const offeringId = req.params.id;

        // Fetch offering
        const offering = await CourseOffering.findByPk(offeringId);
        if (!offering) return res.status(404).json({ success: false, error: 'Offering not found' });

        // OWNERSHIP CHECK: If user is teacher, verify they are assigned to this offering
        if (req.user.role === 'teacher') {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher || offering.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Access denied: You are not assigned to this offering.' });
            }
        }

        const isTeacher = req.user.role === 'teacher';
        const allowedStatuses = isTeacher ? ['enrolled'] : ['enrolled', 'pending', 'rejected'];

        const enrollments = await StudentCourse.findAll({
            where: {
                courseOfferingId: offeringId,
                status: allowedStatuses
            },
            include: [
                {
                    model: Student,
                    include: [
                        { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }
                    ]
                }
            ]
        });

        const isRejected = offering.resultStatus === 'rejected';

        const data = enrollments.map(e => ({
            studentId: e.studentId,
            name: `${e.Student.user.firstName} ${e.Student.user.lastName}`,
            email: e.Student.user.email,
            rollNumber: e.Student.rollNumber,
            studentSemester: e.Student.semester,
            // If rejected, show as 'enrolled' (pending) to Admin
            status: isRejected ? 'enrolled' : e.status,
            enrollmentDate: e.enrollmentDate,
            // If rejected, hide grades from Admin
            grade: isRejected ? null : e.grade,
            gradePoints: isRejected ? null : e.gradePoints
        }));

        console.log(`[DEBUG] GET /offerings/${offeringId}/students - Found ${data.length} students.`);
        const statusCounts = data.reduce((acc, curr) => {
            acc[curr.status] = (acc[curr.status] || 0) + 1;
            return acc;
        }, {});
        console.log(`[DEBUG] Status breakdown:`, statusCounts);

        return res.json({ success: true, data });
    } catch (error) {
        console.error('Get offering students error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
});

// Update student enrollment status
router.put('/:id/students/:studentId/status', requireAuth, requireRole('admin'), async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id, studentId } = req.params;
        const { status } = req.body;

        if (!['enrolled', 'rejected', 'pending'].includes(status)) {
            if (!t.finished) await t.rollback();
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const enrollment = await StudentCourse.findOne({
            where: { courseOfferingId: id, studentId },
            include: [{
                model: CourseOffering,
                include: [{ model: Course, as: 'course' }]
            }],
            transaction: t
        });

        if (!enrollment) {
            if (!t.finished) await t.rollback();
            return res.status(404).json({ success: false, error: 'Enrollment not found' });
        }

        const oldStatus = enrollment.status;
        const credits = enrollment.CourseOffering?.course?.credits || 0;

        // If status is changing to 'enrolled' from anything else, increment counts
        if (status === 'enrolled' && oldStatus !== 'enrolled') {
            // Check seats again
            if (enrollment.CourseOffering.enrolledCount >= enrollment.CourseOffering.maxSeats) {
                if (!t.finished) await t.rollback();
                return res.status(400).json({ success: false, error: 'Cannot accept: Course is full.' });
            }

            await enrollment.CourseOffering.increment('enrolledCount', { by: 1, transaction: t });
            await Student.increment('totalCredits', { by: credits, where: { id: studentId }, transaction: t });
        }
        
        // If status was 'enrolled' and is being changed to something else, decrement counts
        if (oldStatus === 'enrolled' && status !== 'enrolled') {
            await enrollment.CourseOffering.decrement('enrolledCount', { by: 1, transaction: t });
            await Student.decrement('totalCredits', { by: credits, where: { id: studentId }, transaction: t });
        }

        await enrollment.update({ status }, { transaction: t });

        await t.commit();
        return res.json({ success: true, message: `Status updated from ${oldStatus} to ${status} successfully` });
    } catch (error) {
        if (t && !t.finished) await t.rollback();
        console.error('Update enrollment status error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Approve Results (Phase 1 Scenario 2 Logic)
router.post('/:id/results/approve', requireAuth, requireRole('admin'), async (req, res) => {
    const offeringId = req.params.id;
    try {
        const offering = await CourseOffering.findByPk(offeringId);
        if (!offering) return res.status(404).json({ success: false, error: 'Offering not found' });

        const t = await sequelize.transaction();

        try {
            // STEP 1: Acquire appropriate locks (Exclusive lock on rows to be updated)
            // LOCK StudentCourse records for this offering
            await sequelize.query(`
                SELECT id FROM student_courses 
                WHERE courseOfferingId = :offeringId AND status = 'enrolled'
                FOR UPDATE
            `, { replacements: { offeringId }, transaction: t });

            // STEP 1a: Validate all enrolled students have grades
            const [missingGrades] = await sequelize.query(`
                SELECT COUNT(*) as count FROM student_courses 
                WHERE courseOfferingId = :offeringId AND status = 'enrolled' AND grade IS NULL
            `, { replacements: { offeringId }, transaction: t });

            if (missingGrades[0].count > 0) {
                await t.rollback();
                return res.status(400).json({ success: false, error: `Cannot approve: ${missingGrades[0].count} student(s) are missing grades.` });
            }

            // STEP 2 & 3: Update each student's grade status to 'completed'
            // (Assuming grades were already uploaded by teacher, we are now confirming/finalizing)
            await sequelize.query(`
                UPDATE student_courses 
                SET status = 'completed', updatedAt = NOW()
                WHERE courseOfferingId = :offeringId AND status = 'enrolled'
            `, { replacements: { offeringId }, transaction: t });

            // Fetch students affected to perform steps 4, 5, 6
            // BUG FIX: We must limit this specifically to students in THIS offering who just got marked 'completed'
            const [enrollments] = await sequelize.query(`
                SELECT studentId FROM student_courses WHERE courseOfferingId = :offeringId AND status = 'completed'
            `, { replacements: { offeringId }, transaction: t });

            for (const enrollment of enrollments) {
                const studentId = enrollment.studentId;

                // STEP 4: Increment earnedCredits for students who passed (status 'completed' and grade not F/W/I)
                const [academicInfo] = await sequelize.query(`
                    SELECT 
                        SUM(CASE WHEN sc.grade NOT IN ('F', 'W', 'I') THEN c.credits ELSE 0 END) as earnedCredits,
                        SUM(c.credits * sc.gradePoints) as totalGradePoints,
                        SUM(CASE WHEN sc.grade NOT IN ('W', 'I') THEN c.credits ELSE 0 END) as totalCredits
                    FROM student_courses sc
                    JOIN course_offerings co ON sc.courseOfferingId = co.id
                    JOIN courses c ON co.courseId = c.id
                    WHERE sc.studentId = :studentId 
                      AND sc.status = 'completed' 
                      AND (co.resultStatus = 'approved' OR co.id = :offeringId)
                `, { replacements: { studentId, offeringId }, transaction: t });

                const { earnedCredits, totalGradePoints, totalCredits } = academicInfo[0] || { earnedCredits: 0, totalGradePoints: 0, totalCredits: 0 };
                
                // STEP 5: Recalculate CGPA (Only count approved courses, excluding W/I)
                const newCGPA = totalCredits > 0 ? (parseFloat(totalGradePoints) / totalCredits).toFixed(2) : 0.00;

                // STEP 6: Update the cgpa and earnedCredits fields for each affected student
                await sequelize.query(`
                    UPDATE students 
                    SET cgpa = :cgpa, earnedCredits = :earnedCredits, updatedAt = NOW()
                    WHERE id = :studentId
                `, { 
                    replacements: { 
                        cgpa: newCGPA, 
                        earnedCredits: parseInt(earnedCredits) || 0,
                        studentId 
                    },
                    transaction: t
                });
            }

            // STEP 7: Set resultStatus = 'approved' after all grades processed
            await sequelize.query(`
                UPDATE course_offerings SET resultStatus = 'approved', updatedAt = NOW() WHERE id = :offeringId
            `, { replacements: { offeringId }, transaction: t });

            await t.commit();
            console.log('--- PHASE 1 TRANSACTION COMMITTED: RESULTS APPROVED ---');

            return res.json({ success: true, message: 'Results approved and published (Scenario 2 compliant).' });

        } catch (trxError) {
            console.error('--- PHASE 1 TRANSACTION FAILED (Scenario 2): ROLLING BACK ---', trxError);
            if (t && !t.finished) await t.rollback();
            // We should return an error response here instead of just throwing it
            return res.status(500).json({ success: false, error: 'Transaction failed during result approval. Changes rolled back.' });
        }

    } catch (error) {
        console.error('Approve results error:', error);
        return res.status(500).json({ success: false, error: 'Failed to approve results' });
    }
});

// Reject Results
router.post('/:id/results/reject', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const offering = await CourseOffering.findByPk(req.params.id);
        if (!offering) return res.status(404).json({ success: false, error: 'Offering not found' });

        if (offering.resultStatus === 'rejected') {
            return res.status(400).json({ success: false, error: 'Results are already rejected for this offering' });
        }

        // Check if there are any students with 'enrolled' status (current cycle)
        const activeCount = await StudentCourse.count({
            where: { courseOfferingId: req.params.id, status: 'enrolled' }
        });

        if (activeCount === 0) {
            return res.json({ success: true, message: 'No active enrollments to reject. Historical records are safe.' });
        }

        // Update status to rejected
        await offering.update({ resultStatus: 'rejected' });

        // NOTE: We do NOT clear student grades here anymore. 
        // We keep them so the teacher can see what they submitted and fix it.
        // The Admin API will mask these grades if the status is 'rejected'.

        return res.json({ success: true, message: 'Results rejected. Teacher has been notified.' });
    } catch (error) {
        console.error('Reject results error:', error);
        return res.status(500).json({ success: false, error: 'Failed to reject results' });
    }
});

module.exports = router;

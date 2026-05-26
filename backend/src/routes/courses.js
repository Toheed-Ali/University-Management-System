const express = require('express');
const { Op } = require('sequelize');
const { Course, Department, CourseOffering } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function getPagination(query) {
    const page = Number.parseInt(query.page, 10);
    const limit = Number.parseInt(query.limit, 10);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1) return null;
    const safeLimit = Math.min(limit, 200);
    return { page, limit: safeLimit, offset: (page - 1) * safeLimit };
}

// Get all courses
router.get('/courses', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const pagination = getPagination(req.query);
        const queryOptions = {
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code']
                }
            ],
            order: [['code', 'ASC']]
        };
        if (pagination) {
            queryOptions.limit = pagination.limit;
            queryOptions.offset = pagination.offset;
            const { rows, count } = await Course.findAndCountAll(queryOptions);
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

        const courses = await Course.findAll(queryOptions);
        return res.json({ success: true, data: courses });
    } catch (error) {
        console.error('Get courses error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
    }
});

// Get single course
router.get('/courses/:id', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'code']
                }
            ]
        });

        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        return res.json({ success: true, data: course });
    } catch (error) {
        console.error('Get course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch course' });
    }
});

// Create new course
router.post('/courses', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { departmentId, code, name, credits, type } = req.body;

        if (!code || !name) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        // Check for duplicates in the same department
        if (departmentId) {
            const existingCourse = await Course.findOne({
                where: {
                    departmentId,
                    [Op.or]: [
                        { code },
                        { name }
                    ]
                }
            });

            if (existingCourse) {
                return res.status(400).json({
                    success: false,
                    error: existingCourse.code === code
                        ? 'A course with this code already exists in this department'
                        : 'A course with this name already exists in this department'
                });
            }
        }

        const newCourse = await Course.create({
            departmentId,
            code,
            name,
            credits: credits || 3,
            type: type || 'core',
            status: 'active'
        });

        const completeCourse = await Course.findByPk(newCourse.id, {
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
            ]
        });

        return res.status(201).json({ success: true, data: completeCourse });
    } catch (error) {
        console.error('Create course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to create course' });
    }
});

// Update course
router.put('/courses/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Check for duplicates if changing code, name, or department
        const targetDepartmentId = req.body.departmentId || course.departmentId;
        const targetCode = req.body.code || course.code;
        const targetName = req.body.name || course.name;

        if (targetDepartmentId) {
            const existingCourse = await Course.findOne({
                where: {
                    departmentId: targetDepartmentId,
                    id: { [Op.ne]: course.id },
                    [Op.or]: [
                        { code: targetCode },
                        { name: targetName }
                    ]
                }
            });

            if (existingCourse) {
                return res.status(400).json({
                    success: false,
                    error: existingCourse.code === targetCode
                        ? 'A course with this code already exists in this department'
                        : 'A course with this name already exists in this department'
                });
            }
        }

        const { departmentId, code, name, credits, type, status } = req.body;
        await course.update({ departmentId, code, name, credits, type, status });

        const updatedCourse = await Course.findByPk(req.params.id, {
            include: [
                { model: Department, as: 'department', attributes: ['id', 'name', 'code'] }
            ]
        });

        return res.json({ success: true, data: updatedCourse });
    } catch (error) {
        console.error('Update course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to update course' });
    }
});

// Delete course (cascade delete course offerings)
router.delete('/courses/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);

        if (!course) {
            return res.status(404).json({ success: false, error: 'Course not found' });
        }

        // Check if there are active student enrollments in offerings of this course
        const { StudentCourse } = require('../models');
        const enrollmentCount = await StudentCourse.count({
            include: [{
                model: CourseOffering,
                where: { courseId: course.id }
            }]
        });

        if (enrollmentCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete course: Students are enrolled in offerings of this course'
            });
        }

        // Delete all course offerings for this course first
        const deletedOfferings = await CourseOffering.destroy({
            where: { courseId: course.id }
        });

        if (deletedOfferings > 0) {
            console.log(`Deleted ${deletedOfferings} course offerings for course ${course.code}`);
        }

        // Now delete the course
        await course.destroy();

        return res.json({
            success: true,
            message: 'Course deleted successfully',
            data: { deletedOfferings: deletedOfferings }
        });
    } catch (error) {
        console.error('Delete course error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete course' });
    }
});

module.exports = router;

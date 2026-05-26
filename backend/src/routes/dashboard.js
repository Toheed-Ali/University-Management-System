const express = require('express');
const { Student, Teacher, Course, Department, User } = require('../models');
const { Op } = require('sequelize');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');

// Get dashboard statistics (single institution)
router.get('/dashboard/stats', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        // Total counts
        const totalStudents = await Student.count();
        const totalTeachers = await Teacher.count();
        const totalCourses = await Course.count();
        const totalDepartments = await Department.count();

        // Active counts
        const activeStudents = await Student.count({
            include: [{
                model: User,
                as: 'user',
                where: { status: 'active' },
                required: true
            }]
        });

        const activeTeachers = await Teacher.count({
            include: [{
                model: User,
                as: 'user',
                where: { status: 'active' },
                required: true
            }]
        });

        // Recent additions (last 7 days)
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const recentStudents = await Student.count({
            where: {
                createdAt: { [Op.gte]: oneWeekAgo }
            }
        });

        const recentTeachers = await Teacher.count({
            where: {
                createdAt: { [Op.gte]: oneWeekAgo }
            }
        });

        // Total users
        const totalUsers = await User.count();
        const activeUsers = await User.count({ where: { status: 'active' } });

        return res.json({
            success: true,
            data: {
                students: {
                    total: totalStudents,
                    active: activeStudents,
                    recent: recentStudents
                },
                teachers: {
                    total: totalTeachers,
                    active: activeTeachers,
                    recent: recentTeachers
                },
                courses: {
                    total: totalCourses
                },
                departments: {
                    total: totalDepartments
                },
                users: {
                    total: totalUsers,
                    active: activeUsers
                },
                // Summary for dashboard cards
                totalStudents,
                totalTeachers,
                totalCourses,
                totalDepartments,
                activeStudents,
                activeTeachers,
                recentStudents,
                recentTeachers
            }
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch dashboard statistics' });
    }
});

module.exports = router;

const express = require('express');
const { Department, User, Student, Institution } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

/**
 * Resolve the institution ID dynamically so department creation never
 * relies on a hardcoded value. Falls back to creating a default row if
 * the institution table is empty (e.g. a fresh database).
 */
async function resolveInstitutionId() {
    let institution = await Institution.findOne({ attributes: ['id'] });
    if (!institution) {
        institution = await Institution.create({
            name: 'Information Technology University',
            shortName: 'ITU',
            city: 'Lahore',
            province: 'Punjab',
            country: 'Pakistan',
            email: 'admin@itu.edu.pk',
            address: 'Lahore, Punjab, Pakistan'
        });
    }
    return institution.id;
}

const router = express.Router();

// Get all departments
router.get('/departments', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const departments = await Department.findAll({
            include: [
                {
                    model: User,
                    as: 'head',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: Institution,
                    as: 'institution',
                    attributes: ['id', 'name']
                }
            ],
            order: [['name', 'ASC']]
        });

        return res.json({ success: true, data: departments });
    } catch (error) {
        console.error('Get departments error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch departments' });
    }
});

// Get single department
router.get('/departments/:id', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const department = await Department.findByPk(req.params.id, {
            include: [
                {
                    model: User,
                    as: 'head',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                }
            ]
        });

        if (!department) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        return res.json({ success: true, data: department });
    } catch (error) {
        console.error('Get department error:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch department' });
    }
});

// Create new department
router.post('/departments', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, code, degreeTitle, headOfDepartment, totalCreditHours, status } = req.body;

        if (!name || !code || !degreeTitle) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const institutionId = await resolveInstitutionId();

        const newDepartment = await Department.create({
            name,
            code,
            degreeTitle,
            headOfDepartment,
            totalCreditHours,
            institutionId,
            maxCreditsPerSemester: req.body.maxCreditsPerSemester || 18,
            status: 'active'
        });

        const completeDepartment = await Department.findByPk(newDepartment.id, {
            include: [
                { model: User, as: 'head', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
        });

        return res.status(201).json({ success: true, data: completeDepartment });
    } catch (error) {
        console.error('Create department error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Department with this name or code already exists' });
        }
        return res.status(500).json({ success: false, error: 'Failed to create department' });
    }
});

// Update department
router.put('/departments/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const department = await Department.findByPk(req.params.id);

        if (!department) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        await department.update(req.body);

        // Cascade status change to students
        if (req.body.status === 'inactive') {
            const students = await Student.findAll({ where: { departmentId: department.id } });
            if (students.length > 0) {
                const userIds = students.map(s => s.userId);
                await User.update({ status: 'inactive' }, { where: { id: userIds } });
            }
        } else if (req.body.status === 'active') {
            const students = await Student.findAll({ where: { departmentId: department.id } });
            if (students.length > 0) {
                const userIds = students.map(s => s.userId);
                await User.update({ status: 'active' }, { where: { id: userIds } });
            }
        }

        const updatedDepartment = await Department.findByPk(req.params.id, {
            include: [
                { model: User, as: 'head', attributes: ['id', 'firstName', 'lastName', 'email'] }
            ]
        });

        return res.json({ success: true, data: updatedDepartment });
    } catch (error) {
        console.error('Update department error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ success: false, error: 'Department with this name or code already exists' });
        }
        return res.status(500).json({ success: false, error: 'Failed to update department' });
    }
});

// Delete department
router.delete('/departments/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const department = await Department.findByPk(req.params.id);

        if (!department) {
            return res.status(404).json({ success: false, error: 'Department not found' });
        }

        // Check if there are active students, batches, sections, or courses associated
        const { Batch, Section, Course } = require('../models');
        const studentCount = await Student.count({ where: { departmentId: department.id } });
        const batchCount = await Batch.count({ where: { departmentId: department.id } });
        const sectionCount = await Section.count({ where: { departmentId: department.id } });
        const courseCount = await Course.count({ where: { departmentId: department.id } });

        if (studentCount > 0 || batchCount > 0 || sectionCount > 0 || courseCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete department: There are active batches, sections, courses, or students associated with it'
            });
        }

        await department.destroy();

        return res.json({ success: true, message: 'Department deleted successfully' });
    } catch (error) {
        console.error('Delete department error:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete department' });
    }
});

module.exports = router;

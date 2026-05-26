const express = require('express');
const router = express.Router();
const { Section, Batch } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all sections (optionally filtered by batch or department)
router.get('/', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const { batchId, departmentId } = req.query;
        const whereClause = {};
        if (batchId) whereClause.batchId = batchId;
        if (departmentId) whereClause.departmentId = departmentId;

        const sections = await Section.findAll({
            where: whereClause,
            include: [{ model: Batch, as: 'batch', attributes: ['name'] }],
            order: [['name', 'ASC']]
        });
        res.json({ success: true, data: sections });
    } catch (error) {
        console.error('Error fetching sections:', error);
        res.status(500).json({ success: false, error: 'Error fetching sections' });
    }
});

// Create a new section
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, batchId, departmentId, status } = req.body;

        if (!name || !batchId || !departmentId) {
            return res.status(400).json({ success: false, error: 'Name, batch ID, and department ID are required' });
        }

        // Check for duplicate
        const existingSection = await Section.findOne({
            where: { name, batchId }
        });

        if (existingSection) {
            return res.status(400).json({ success: false, error: 'Section already exists in this batch' });
        }

        const section = await Section.create({ name, batchId, departmentId, status: status || 'active' });
        res.status(201).json({ success: true, data: section });
    } catch (error) {
        console.error('Error creating section:', error);
        res.status(500).json({ success: false, error: 'Error creating section' });
    }
});

// Delete a section and its students
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const section = await Section.findByPk(req.params.id);

        if (!section) {
            return res.status(404).json({ success: false, error: 'Section not found' });
        }

        const { Student, User, CourseOffering, StudentCourse } = require('../models');

        // Check if there are active students or student course enrollments
        const studentCount = await Student.count({ where: { sectionId: section.id } });
        if (studentCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete section: There are students enrolled in this section'
            });
        }

        const enrollmentCount = await StudentCourse.count({
            include: [{
                model: CourseOffering,
                where: { sectionId: section.id }
            }]
        });

        if (enrollmentCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete section: There are student enrollments in offerings of this section'
            });
        }

        // Delete CourseOfferings associated with this section
        await CourseOffering.destroy({
            where: { sectionId: section.id }
        });

        // Delete Section
        await section.destroy();
        res.json({ success: true, message: 'Section deleted successfully' });
    } catch (error) {
        console.error('Error deleting section:', error);
        res.status(500).json({ success: false, error: 'Error deleting section: ' + error.message });
    }
});

module.exports = router;

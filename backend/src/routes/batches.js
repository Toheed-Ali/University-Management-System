const express = require('express');
const router = express.Router();
const { Batch, Section, CourseOffering } = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all batches (optionally filtered by department)
router.get('/', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const { departmentId } = req.query;
        const whereClause = {};
        if (departmentId) whereClause.departmentId = departmentId;

        const batches = await Batch.findAll({
            where: whereClause,
            order: [['year', 'DESC'], ['name', 'ASC']]
        });
        res.json({ success: true, data: batches });
    } catch (error) {
        console.error('Error fetching batches:', error);
        res.status(500).json({ success: false, error: 'Error fetching batches' });
    }
});

// Create a new batch
router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, departmentId, year, status } = req.body;

        if (!name || !departmentId || !year) {
            return res.status(400).json({ success: false, error: 'Name, department ID, and year are required' });
        }

        // Check for duplicate
        const existingBatch = await Batch.findOne({
            where: { name, departmentId }
        });

        if (existingBatch) {
            return res.status(400).json({ success: false, error: 'Batch already exists in this department' });
        }

        const batch = await Batch.create({ name, departmentId, year, status: status || 'active' });
        res.status(201).json({ success: true, data: batch });
    } catch (error) {
        console.error('Error creating batch:', error);
        res.status(500).json({ success: false, error: 'Error creating batch' });
    }
});

// Delete a batch and its students/sections
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) {
            return res.status(404).json({ success: false, error: 'Batch not found' });
        }

        const { Student, User, StudentCourse } = require('../models');

        // Check if there are active students or student course enrollments
        const studentCount = await Student.count({ where: { batchId: batch.id } });
        if (studentCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete batch: There are students enrolled in this batch'
            });
        }

        const enrollmentCount = await StudentCourse.count({
            include: [{
                model: CourseOffering,
                where: { batchId: batch.id }
            }]
        });

        if (enrollmentCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete batch: There are student enrollments in offerings of this batch'
            });
        }

        // Delete CourseOfferings associated with this batch
        await CourseOffering.destroy({
            where: {
                batchId: batch.id
            }
        });

        // Delete sections associated with this batch
        await Section.destroy({
            where: {
                batchId: batch.id
            }
        });

        // Delete the batch
        await batch.destroy();

        res.json({
            success: true,
            message: 'Batch deleted successfully',
            data: { deletedStudents: 0 }
        });
    } catch (error) {
        console.error('Error deleting batch:', error);
        res.status(500).json({ success: false, error: 'Error deleting batch' });
    }
});

module.exports = router;

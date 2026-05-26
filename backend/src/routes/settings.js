const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const Institution = require('../models/Institution');
const Student = require('../models/Student');

// GET registration window - public access for students
router.get('/registration-window', requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const institution = await Institution.findOne();
        if (!institution) {
            return res.json({
                success: true,
                data: { startDate: null, endDate: null, isOpen: false }
            });
        }

        const now = new Date();
        const startDate = institution.registrationStartDate;
        const endDate = institution.registrationEndDate;

        let isOpen = false;
        if (startDate && endDate) {
            isOpen = now >= new Date(startDate) && now <= new Date(endDate);
        }

        res.json({
            success: true,
            data: {
                startDate: startDate,
                endDate: endDate,
                isOpen: isOpen
            }
        });
    } catch (error) {
        console.error('Error getting registration window:', error);
        res.status(500).json({ success: false, error: 'Failed to get registration window' });
    }
});

// GET all institution settings
router.get(['/institution', '/university'], requireAuth, requireRole('admin', 'teacher', 'student'), async (req, res) => {
    try {
        const institution = await Institution.findOne();
        if (!institution) {
            // Create default if none exists
            const defaultInst = await Institution.create({
                name: 'Information Technology University',
                shortName: 'ITU',
                city: 'Lahore',
                province: 'Punjab',
                country: 'Pakistan',
                email: 'admin@itu.edu.pk',
                address: 'Lahore, Punjab, Pakistan'
            });
            return res.json({ success: true, data: defaultInst });
        }
        res.json({ success: true, data: institution });
    } catch (error) {
        console.error('Error getting institution settings:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch settings' });
    }
});

// UPDATE institution settings
router.put('/institution', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, shortName, city, province, country, email, address } = req.body;
        const updateData = { name, shortName, city, province, country, email, address };

        let institution = await Institution.findOne();
        if (!institution) {
            institution = await Institution.create(updateData);
        } else {
            await institution.update(updateData);
        }
        res.json({ success: true, message: 'Settings updated successfully', data: institution });
    } catch (error) {
        console.error('Error updating institution settings:', error);
        res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
});

// PUT registration window - admin only
router.put('/registration-window', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, error: 'Start and end dates are required' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();

        if (start >= end) {
            return res.status(400).json({ success: false, error: 'End date must be after start date' });
        }

        let institution = await Institution.findOne();

        if (!institution) {
            institution = await Institution.create({
                name: 'University',
                registrationStartDate: startDate,
                registrationEndDate: endDate
            });
        } else {
            await institution.update({
                registrationStartDate: startDate,
                registrationEndDate: endDate
            });
        }

        res.json({
            success: true,
            message: 'Registration window updated successfully',
            data: {
                startDate: institution.registrationStartDate,
                endDate: institution.registrationEndDate
            }
        });
    } catch (error) {
        console.error('Error updating registration window:', error);
        res.status(500).json({ success: false, error: 'Failed to update registration window' });
    }
});

// PUT registration window for specific student - admin only
router.put('/registration-window/student', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { rollNumber, startDate, endDate, durationHours } = req.body;

        if (!rollNumber) {
            return res.status(400).json({ success: false, error: 'Student Roll Number is required' });
        }

        const student = await Student.findOne({ where: { rollNumber } });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found with roll number: ' + rollNumber });
        }

        // Use custom dates if provided, otherwise use duration (default 24h)
        let start, end;
        if (startDate && endDate) {
            start = new Date(startDate);
            end = new Date(endDate);
        } else {
            const hours = durationHours || 24;
            start = new Date();
            end = new Date(Date.now() + hours * 60 * 60 * 1000);
        }

        if (start >= end) {
            return res.status(400).json({ success: false, error: 'End date must be after start date' });
        }

        await student.update({
            registrationStartDate: start,
            registrationEndDate: end
        });

        res.json({
            success: true,
            message: `Registration window opened for student ${rollNumber} until ${end.toLocaleString()}`,
            data: {
                rollNumber: student.rollNumber,
                startDate: student.registrationStartDate,
                endDate: student.registrationEndDate
            }
        });
    } catch (error) {
        console.error('Error updating student registration window:', error);
        res.status(500).json({ success: false, error: 'Failed to update student registration window' });
    }
});

// DELETE/Close registration window for specific student - admin only
router.delete('/registration-window/student/:rollNumber', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { rollNumber } = req.params;

        const student = await Student.findOne({ where: { rollNumber } });
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found with roll number: ' + rollNumber });
        }

        await student.update({
            registrationStartDate: null,
            registrationEndDate: null
        });

        res.json({
            success: true,
            message: `Registration window closed for student ${rollNumber}`
        });
    } catch (error) {
        console.error('Error closing student registration window:', error);
        res.status(500).json({ success: false, error: 'Failed to close student registration window' });
    }
});

// GET students with individual registration windows
router.get('/registration-window/students', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { User } = require('../models');

        const students = await Student.findAll({
            where: {
                registrationStartDate: { [require('sequelize').Op.not]: null },
                registrationEndDate: { [require('sequelize').Op.not]: null }
            },
            attributes: ['id', 'rollNumber', 'registrationStartDate', 'registrationEndDate'],
            include: [{
                model: User,
                as: 'user',
                attributes: ['firstName', 'lastName']
            }],
            order: [['registrationEndDate', 'DESC']]
        });

        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        console.error('Error fetching students with registration overrides:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch students' });
    }
});

module.exports = router;

const express = require('express');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');
const mime = require('mime-types'); // FIX: added for correct Content-Type on inline serving
const {
    Assignment, AssignmentSubmission, CourseOffering,
    Course, Teacher, Student, StudentCourse, User
} = require('../models');
const { requireAuth, requireRole } = require('../middleware/auth');
const MossClient = require('../utils/moss');
const { config } = require('../config');

const router = express.Router();
const MAX_SUBMISSION_FILE_MB = Number.parseInt(process.env.MAX_SUBMISSION_FILE_MB || '25', 10);
const MAX_SUBMISSION_FILE_BYTES = Math.max(1, MAX_SUBMISSION_FILE_MB) * 1024 * 1024;


const uploadDir = path.join(__dirname, '../../uploads/submissions');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
        cb(null, `${uniqueSuffix}-${safeOriginalName}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: MAX_SUBMISSION_FILE_BYTES, files: 10 }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeUnlink = (filePath) => {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }
    catch (e) { console.error('safeUnlink error:', e.message); }
};

const toInt = (value) => Number.parseInt(value, 10);

async function buildPlagiarismResults(assignment, submissions) {
    if (!assignment?.plagiarismReportUrl) return null;

    try {
        const moss = new MossClient();
        const mossMatches = await moss.parseReport(assignment.plagiarismReportUrl, 0);

        const rollToSubId = {};
        submissions.forEach((sub) => {
            rollToSubId[sub.rollNumber] = sub.id;
        });

        const matches = mossMatches.map((match) => {
            const roll1 = match.submission1.split('/')[0];
            const roll2 = match.submission2.split('/')[0];

            return {
                student1: roll1,
                student2: roll2,
                subId1: rollToSubId[roll1] || null,
                subId2: rollToSubId[roll2] || null,
                similarity: match.highest
            };
        });

        matches.sort((a, b) => b.similarity - a.similarity);

        return {
            reportUrl: assignment.plagiarismReportUrl,
            matchCount: assignment.plagiarismMatchCount ?? matches.length,
            threshold: assignment.plagiarismThreshold ?? 10,
            matches
        };
    } catch (error) {
        console.warn('Unable to restore plagiarism results:', error.message);
        return null;
    }
}

const mossLanguageByExtension = {
    '.cpp': 'cc',
    '.cc': 'cc',
    '.cxx': 'cc',
    '.c': 'c',
    '.java': 'java',
    '.py': 'python',
    '.js': 'javascript',
    '.html': 'html',
    '.css': 'css',
    '.txt': 'ascii',
    '.asm': 'ascii',
    '.lst': 'ascii'
};

const textLikeExtensions = new Set([
    '.md', '.json', '.xml', '.yml', '.yaml', '.csv', '.tsv', '.log',
    '.ini', '.cfg', '.conf', '.sql', '.sh', '.bat', '.ps1', '.tex'
]);

function isProbablyTextFile(filePath) {
    try {
        const buffer = fs.readFileSync(filePath);
        if (buffer.length === 0) return true;
        if (buffer.includes(0)) return false;

        const sampleLength = Math.min(buffer.length, 2048);
        let controlChars = 0;

        for (let i = 0; i < sampleLength; i++) {
            const byte = buffer[i];
            if (byte === 9 || byte === 10 || byte === 13) continue;
            if (byte < 32 || byte === 127) controlChars++;
        }

        return controlChars / sampleLength < 0.2;
    } catch (error) {
        console.warn(`Unable to inspect file type for ${filePath}:`, error.message);
        return false;
    }
}

function getMossLanguageForFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (mossLanguageByExtension[ext]) return mossLanguageByExtension[ext];
    if (textLikeExtensions.has(ext) || isProbablyTextFile(filePath)) return 'ascii';
    return null;
}

async function getCurrentStudent(req) {
    return Student.findOne({ where: { userId: req.user.id } });
}

async function getCurrentTeacher(req) {
    return Teacher.findOne({ where: { userId: req.user.id } });
}

async function isStudentEnrolled(studentId, offeringId) {
    const enrollment = await StudentCourse.findOne({
        where: { studentId, courseOfferingId: offeringId, status: 'enrolled' },
        attributes: ['id']
    });
    return Boolean(enrollment);
}

async function ensureStudentEnrollment(req, res, studentId, offeringId) {
    const enrolled = await isStudentEnrolled(studentId, offeringId);
    if (!enrolled) {
        res.status(403).json({ success: false, error: 'Access denied: you are not enrolled in this course offering' });
        return false;
    }
    return true;
}

async function canAccessSubmissionFile(req, filename) {
    if (req.user.role === 'admin') return true;

    const submission = await AssignmentSubmission.findOne({
        where: {
            submissionFile: { [Op.like]: `%${filename}%` }
        },
        include: [{
            model: Assignment,
            as: 'assignment',
            include: [{ model: CourseOffering, as: 'offering', attributes: ['id', 'teacherId'] }]
        }]
    });
    if (!submission) return false;

    const files = Array.isArray(submission.submissionFile) ? submission.submissionFile : [];
    if (!files.includes(filename)) return false;

    if (req.user.role === 'teacher') {
        const teacher = await getCurrentTeacher(req);
        return Boolean(teacher && submission.assignment?.offering?.teacherId === teacher.id);
    }

    if (req.user.role === 'student') {
        const student = await getCurrentStudent(req);
        return Boolean(student && submission.studentId === student.id);
    }

    return false;
}

// --- BASE ASSIGNMENT DETAIL (Teacher & Student) ---
router.get(
    '/assignments/:id',
    requireAuth, requireRole('teacher', 'student'),
    async (req, res) => {
        const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);
        log(`[HIT] GET /assignments/${req.params.id} - User: ${req.user.id}, Role: ${req.user.role}`);

        try {
            const isTeacher = req.user.role === 'teacher';

            if (isTeacher) {
                const teacher = await getCurrentTeacher(req);
                if (!teacher) {
                    console.warn(`[403-DEBUG] Teacher not found for userId: ${req.user.id}`);
                    return res.status(403).json({ success: false, error: 'Teacher not found' });
                }

                const assignment = await Assignment.findByPk(req.params.id, {
                    include: [{ model: CourseOffering, as: 'offering' }]
                });
                if (!assignment) {
                    console.warn(`[404-DEBUG] Assignment ${req.params.id} not found`);
                    return res.status(404).json({ success: false, error: 'Assignment not found' });
                }

                // OWNERSHIP CHECK: Teacher must be the creator OR assigned to the offering
                if (assignment.createdBy !== teacher.id && assignment.offering?.teacherId !== teacher.id) {
                    console.warn(`[403-DEBUG] Teacher ${teacher.id} not authorized for Assignment ${req.params.id}`);
                    return res.status(403).json({ success: false, error: 'Not authorized to view this assignment' });
                }

                console.log(`[SUCCESS-DEBUG] Teacher ${teacher.id} (UID: ${req.user.id}) matched assignment ${req.params.id}`);
                return res.json({ success: true, data: assignment });
            }

            // Student logic
            const student = await getCurrentStudent(req);
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const assignment = await Assignment.findByPk(req.params.id, {
                include: [
                    { model: AssignmentSubmission, as: 'submissions', where: { studentId: student.id }, required: false },
                    { model: CourseOffering, as: 'offering', include: [{ model: Course, as: 'course' }] }
                ]
            });

            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (!await ensureStudentEnrollment(req, res, student.id, assignment.courseOfferingId)) return;

            const data = {
                id: assignment.id, assignmentNumber: assignment.assignmentNumber, title: assignment.title, description: assignment.description,
                totalMarks: assignment.totalMarks, dueDate: assignment.dueDate, createdAt: assignment.createdAt, updatedAt: assignment.updatedAt,
                submitted: assignment.submissions && assignment.submissions.some(s => s.status !== 'draft'),
                submission: assignment.submissions?.[0] ? {
                    id: assignment.submissions[0].id, status: assignment.submissions[0].status,
                    marksAwarded: assignment.submissions[0].marksAwarded,
                    submittedAt: assignment.submissions[0].submittedAt,
                    submissionFile: assignment.submissions[0].submissionFile
                } : null,
                course: { name: assignment.offering?.course?.name, code: assignment.offering?.course?.code }
            };
            log(`[SUCCESS] Student ${student.id} fetching assignment ${req.params.id}`);
            return res.json({ success: true, data });
        } catch (error) {
            log(`[FATAL] GET /assignments/${req.params.id} error: ${error.message}`);
            return res.status(500).json({ success: false, error: 'Failed to fetch assignment details' });
        }
    }
);

// ========================================================
//  TEACHER ENDPOINTS
// ========================================================

router.get(
    '/offerings/:offeringId/assignments',
    requireAuth, requireRole('teacher', 'admin'),
    async (req, res) => {
        try {
            if (req.user.role === 'teacher') {
                const teacher = await getCurrentTeacher(req);
                const offering = await CourseOffering.findByPk(req.params.offeringId, { attributes: ['id', 'teacherId'] });
                if (!teacher || !offering || offering.teacherId !== teacher.id) {
                    return res.status(403).json({ success: false, error: 'Access denied: you are not assigned to this offering' });
                }
            }

            const assignments = await Assignment.findAll({
                where: { courseOfferingId: req.params.offeringId },
                include: [{
                    model: AssignmentSubmission, as: 'submissions',
                    attributes: ['id'],
                    where: { status: { [Op.ne]: 'draft' } },
                    required: false
                }],
                order: [['dueDate', 'ASC']]
            });
            const data = assignments.map(a => ({
                id: a.id, assignmentNumber: a.assignmentNumber, title: a.title, description: a.description,
                totalMarks: a.totalMarks, dueDate: a.dueDate,
                submissionCount: a.submissions?.length || 0, createdAt: a.createdAt, updatedAt: a.updatedAt
            }));
            return res.json({ success: true, data });
        } catch (error) {
            console.error('Get assignments error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
        }
    }
);

router.post(
    '/offerings/:offeringId/assignments',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const { title, description, totalMarks, dueDate } = req.body;
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const offering = await CourseOffering.findByPk(req.params.offeringId);
            if (!offering || offering.teacherId !== teacher.id)
                return res.status(403).json({ success: false, error: 'Not authorized for this course' });

            if (!title || !totalMarks || !dueDate)
                return res.status(400).json({ success: false, error: 'Title, total marks, and due date are required' });

            const parsedDueDate = new Date(dueDate);
            if (parsedDueDate <= new Date()) {
                return res.status(400).json({ success: false, error: 'Due date must be in the future' });
            }

            // Get the next assignment number for this offering
            const lastAssignment = await Assignment.findOne({
                where: { courseOfferingId: req.params.offeringId },
                order: [['assignmentNumber', 'DESC']]
            });
            const assignmentNumber = lastAssignment ? lastAssignment.assignmentNumber + 1 : 1;

            const assignment = await Assignment.create({
                courseOfferingId: req.params.offeringId,
                assignmentNumber,
                title,
                description: description || null,
                totalMarks: parseInt(totalMarks, 10),
                dueDate: parsedDueDate,
                createdBy: teacher.id
            });
            return res.status(201).json({ success: true, data: assignment });
        } catch (error) {
            console.error('Create assignment error:', error);
            return res.status(500).json({ success: false, error: 'Failed to create assignment' });
        }
    }
);

router.put(
    '/assignments/:id',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const { title, description, totalMarks, dueDate } = req.body;
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const assignment = await Assignment.findByPk(req.params.id);
            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (assignment.createdBy !== teacher.id)
                return res.status(403).json({ success: false, error: 'Not authorized' });

            if (!title || !totalMarks || !dueDate)
                return res.status(400).json({ success: false, error: 'Title, total marks, and due date are required' });

            const parsedDueDate = new Date(dueDate);
            if (parsedDueDate <= new Date()) {
                return res.status(400).json({ success: false, error: 'Due date must be in the future' });
            }

            await assignment.update({
                title,
                description: description || null,
                totalMarks: parseInt(totalMarks, 10),
                dueDate: parsedDueDate
            });

            return res.json({ success: true, data: assignment });
        } catch (error) {
            console.error('Update assignment error:', error);
            return res.status(500).json({ success: false, error: 'Failed to update assignment' });
        }
    }
);

router.delete(
    '/assignments/:id',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const assignment = await Assignment.findByPk(req.params.id);
            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (assignment.createdBy !== teacher.id)
                return res.status(403).json({ success: false, error: 'Not authorized' });

            const submissions = await AssignmentSubmission.findAll({ where: { assignmentId: assignment.id } });
            for (const sub of submissions) {
                const files = Array.isArray(sub.submissionFile) ? sub.submissionFile : [];
                for (const f of files) safeUnlink(path.join(uploadDir, f));
            }
            await AssignmentSubmission.destroy({ where: { assignmentId: assignment.id } });
            await assignment.destroy();
            return res.json({ success: true, message: 'Assignment deleted' });
        } catch (error) {
            console.error('Delete assignment error:', error);
            return res.status(500).json({ success: false, error: 'Failed to delete assignment' });
        }
    }
);

router.post(
    '/assignments/:id/check-plagiarism',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const requestedThreshold = Number.isInteger(toInt(req.body?.threshold))
                ? toInt(req.body.threshold)
                : 10;

            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const assignment = await Assignment.findByPk(req.params.id, {
                include: [{ model: CourseOffering, as: 'offering' }]
            });

            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });

            if (assignment.createdBy !== teacher.id && assignment.offering?.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Not authorized' });
            }

            const submissions = await AssignmentSubmission.findAll({
                where: { assignmentId: assignment.id, status: { [Op.ne]: 'draft' } },
                include: [{ model: Student, as: 'student' }]
            });

            if (submissions.length < 2) {
                return res.status(400).json({ success: false, error: 'Need at least 2 submissions to check plagiarism' });
            }

            let detectedLang = 'ascii'; // fallback
            for (const sub of submissions) {
                const files = Array.isArray(sub.submissionFile) ? sub.submissionFile : [sub.submissionFile];
                for (const f of files) {
                    const fpath = path.join(uploadDir, f);
                    const fileLang = getMossLanguageForFile(fpath);
                    if (fileLang) {
                        detectedLang = fileLang;
                        break;
                    }
                }
                if (detectedLang !== 'ascii') break;
            }

            try {
                // Initialize MossClient with detected language
                const moss = new MossClient(detectedLang);

                // Helper to get original name
                const getOriginalName = (fname) => {
                    const dash1 = fname.indexOf('-');
                    const dash2 = fname.indexOf('-', dash1 + 1);
                    return dash2 !== -1 ? fname.substring(dash2 + 1).toLowerCase() : fname;
                };

                let filesAdded = 0;
                for (const sub of submissions) {
                    const files = Array.isArray(sub.submissionFile) ? sub.submissionFile : [sub.submissionFile];
                    for (const f of files) {
                        const fpath = path.join(uploadDir, f);
                        if (fs.existsSync(fpath)) {
                            const fileLang = getMossLanguageForFile(fpath);
                            if (fileLang && fileLang === detectedLang) {
                                // Add file with display name structured as: RollNumber/OriginalFileName
                                const displayName = `${sub.student.rollNumber}/${getOriginalName(f)}`;
                                moss.addFile(fpath, displayName);
                                filesAdded++;
                            }
                        }
                    }
                }

                if (filesAdded === 0) {
                    return res.status(400).json({ success: false, error: 'No compatible code or text files found in the submissions to check' });
                }

                // Submit to MOSS and get the report URL
                const reportUrl = await moss.submit();
                console.log('MOSS report generated successfully:', reportUrl);

                // Parse the report to find all matches (threshold = 0)
                const mossMatches = await moss.parseReport(reportUrl, 0);

                // Build a lookup to find submission IDs from roll numbers
                const rollToSubId = {};
                submissions.forEach(sub => {
                    rollToSubId[sub.student.rollNumber] = sub.id;
                });

                // Map parsed MOSS matches back to the format the frontend expects
                const results = mossMatches.map(match => {
                    const roll1 = match.submission1.split('/')[0];
                    const roll2 = match.submission2.split('/')[0];
                    return {
                        student1: roll1,
                        student2: roll2,
                        subId1: rollToSubId[roll1] || null,
                        subId2: rollToSubId[roll2] || null,
                        similarity: match.highest
                    };
                });

                results.sort((a, b) => b.similarity - a.similarity);

                await assignment.update({
                    plagiarismReportUrl: reportUrl,
                    plagiarismThreshold: requestedThreshold,
                    plagiarismMatchCount: results.length
                });

                return res.json({
                    success: true,
                    data: {
                        reportUrl,
                        matchCount: results.length,
                        threshold: requestedThreshold,
                        matches: results
                    }
                });
            } catch (error) {
                console.error('MOSS Plagiarism check error:', error);
                return res.status(500).json({ success: false, error: 'MOSS Plagiarism check failed: ' + error.message });
            }
        } catch (error) {
            console.error('Plagiarism check error:', error);
            return res.status(500).json({ success: false, error: 'Plagiarism check failed' });
        }
    }
);

router.get(
    '/assignments/:id/submissions',
    requireAuth, requireRole('teacher', 'admin'),
    async (req, res) => {
        try {
            const assignment = await Assignment.findByPk(req.params.id, {
                include: [{
                    model: CourseOffering, as: 'offering',
                    include: [{ model: Course, as: 'course' }]
                }]
            });

            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });

            // OWNERSHIP CHECK: If user is teacher, verify they own the assignment or are assigned to the offering
            if (req.user.role === 'teacher') {
                const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
                if (!teacher || (assignment.createdBy !== teacher.id && assignment.offering?.teacherId !== teacher.id)) {
                    return res.status(403).json({ success: false, error: 'Access denied: You do not have permission to view these submissions.' });
                }
            }

            const students = await Student.findAll({
                include: [
                    {
                        model: StudentCourse,
                        where: { courseOfferingId: assignment.courseOfferingId, status: 'enrolled' },
                        attributes: []
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['firstName', 'lastName', 'email']
                    },
                    {
                        model: AssignmentSubmission,
                        as: 'submissions',
                        where: {
                            assignmentId: req.params.id,
                            status: { [Op.ne]: 'draft' }
                        },
                        required: false
                    }
                ],
                order: [['rollNumber', 'ASC']]
            });

            const data = students.map(s => {
                const sub = s.submissions && s.submissions.length > 0 ? s.submissions[0] : null;
                return {
                    id: sub?.id || null,
                    studentId: s.id,
                    studentName: `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim(),
                    rollNumber: s.rollNumber,
                    submissionFile: sub?.submissionFile || null,
                    submittedAt: sub?.submittedAt || null,
                    status: sub ? sub.status : 'missing',
                    marksAwarded: sub?.marksAwarded,
                    gradedAt: sub?.gradedAt
                };
            });

            const plagiarismResults = await buildPlagiarismResults(
                assignment,
                students
                    .map((student) => ({
                        id: student.submissions && student.submissions.length > 0 ? student.submissions[0].id : null,
                        rollNumber: student.rollNumber
                    }))
                    .filter((item) => item.id)
            );

            return res.json({
                success: true,
                data,
                assignment: {
                    title: assignment.title,
                    assignmentNumber: assignment.assignmentNumber,
                    totalMarks: assignment.totalMarks,
                    courseName: assignment.offering?.course?.name,
                    courseCode: assignment.offering?.course?.code,
                    plagiarismReportUrl: assignment.plagiarismReportUrl,
                    plagiarismMatchCount: assignment.plagiarismMatchCount,
                    plagiarismThreshold: assignment.plagiarismThreshold
                },
                plagiarismResults
            });
        } catch (error) {
            console.error('Get submissions error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
        }
    }
);

router.put(
    '/submissions/:id/grade',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const { marksAwarded } = req.body;
            if (marksAwarded === undefined || marksAwarded === null)
                return res.status(400).json({ success: false, error: 'marksAwarded is required' });

            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const submission = await AssignmentSubmission.findByPk(req.params.id, {
                include: [{
                    model: Assignment, as: 'assignment',
                    include: [{ model: CourseOffering, as: 'offering' }]
                }]
            });
            if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
            const parsedMarks = toInt(marksAwarded);
            if (!Number.isInteger(parsedMarks) || parsedMarks < 0 || parsedMarks > submission.assignment.totalMarks) {
                return res.status(400).json({ success: false, error: `marksAwarded must be an integer between 0 and ${submission.assignment.totalMarks}` });
            }

            // OWNERSHIP CHECK: Teacher must be the creator OR assigned to the offering
            if (submission.assignment.createdBy !== teacher.id && submission.assignment.offering?.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Not authorized to grade this submission' });
            }

            await submission.update({
                marksAwarded: parsedMarks, status: 'graded',
                gradedBy: teacher.id, gradedAt: new Date()
            });
            return res.json({ success: true, data: submission });
        } catch (error) {
            console.error('Grade submission error:', error);
            return res.status(500).json({ success: false, error: 'Failed to grade submission' });
        }
    }
);

// Bulk Grade Submissions
router.post(
    '/assignments/:id/bulk-grade',
    requireAuth, requireRole('teacher'),
    async (req, res) => {
        try {
            const { grades } = req.body; // Array of { submissionId, marksAwarded }
            if (!Array.isArray(grades)) {
                return res.status(400).json({ success: false, error: 'grades array is required' });
            }

            const teacher = await Teacher.findOne({ where: { userId: req.user.id } });
            if (!teacher) return res.status(403).json({ success: false, error: 'Teacher not found' });

            const assignment = await Assignment.findByPk(req.params.id, {
                include: [{ model: CourseOffering, as: 'offering' }]
            });

            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });

            // OWNERSHIP CHECK
            if (assignment.createdBy !== teacher.id && assignment.offering?.teacherId !== teacher.id) {
                return res.status(403).json({ success: false, error: 'Not authorized to grade this assignment' });
            }

            const results = [];
            for (const item of grades) {
                const { studentId, marksAwarded } = item;
                if (!studentId || marksAwarded === undefined) continue;

                const parsedMarks = toInt(marksAwarded);
                if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > assignment.totalMarks) continue;

                // Find existing submission or create a new one for "Missing" students
                let submission = await AssignmentSubmission.findOne({
                    where: { studentId, assignmentId: assignment.id }
                });

                if (submission) {
                    await submission.update({
                        marksAwarded: parsedMarks,
                        status: 'graded',
                        gradedBy: teacher.id,
                        gradedAt: new Date()
                    });
                } else {
                    await AssignmentSubmission.create({
                        assignmentId: assignment.id,
                        studentId,
                        marksAwarded: parsedMarks,
                        status: 'graded',
                        gradedBy: teacher.id,
                        gradedAt: new Date(),
                        submissionFile: [] // FIX: submissionFile is required by the model
                    });
                }
                results.push({ studentId, status: 'graded', marksAwarded: parsedMarks });
            }

            return res.json({ success: true, data: results });
        } catch (error) {
            console.error('Bulk grade error:', error);
            return res.status(500).json({ success: false, error: 'Failed to bulk grade submissions' });
        }
    }
);

// ========================================================
//  STUDENT ENDPOINTS
// ========================================================

router.get(
    '/student/my-courses-assignments',
    requireAuth, requireRole('student'),
    async (req, res) => {
        try {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const enrollments = await StudentCourse.findAll({
                where: { studentId: student.id, status: 'enrolled' },
                include: [{
                    model: CourseOffering,
                    include: [
                        { model: Course, as: 'course', attributes: ['id', 'name', 'code', 'credits'] },
                        { model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName'] }] },
                        { model: Assignment, as: 'assignments', attributes: ['id', 'assignmentNumber', 'title', 'dueDate'] }
                    ]
                }]
            });

            const now = new Date();
            const data = enrollments.map(e => {
                const assignments = e.CourseOffering?.assignments || [];
                const dueAssignments = assignments
                    .filter(a => new Date(a.dueDate) >= now)
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map(a => ({ id: a.id, assignmentNumber: a.assignmentNumber, title: a.title, dueDate: a.dueDate }));
                return {
                    offeringId: e.courseOfferingId,
                    courseName: e.CourseOffering?.course?.name,
                    courseCode: e.CourseOffering?.course?.code,
                    credits: e.CourseOffering?.course?.credits,
                    teacherName: e.CourseOffering?.teacher?.user
                        ? `${e.CourseOffering.teacher.user.firstName} ${e.CourseOffering.teacher.user.lastName}` : 'TBA',
                    semester: e.CourseOffering?.semester,
                    assignmentCount: assignments.length, dueAssignments
                };
            });
            return res.json({ success: true, data });
        } catch (error) {
            console.error('Get student courses error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch courses' });
        }
    }
);

router.get(
    '/student/offerings/:offeringId/assignments',
    requireAuth, requireRole('student'),
    async (req, res) => {
        try {
            const student = await getCurrentStudent(req);
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });
            if (!await ensureStudentEnrollment(req, res, student.id, toInt(req.params.offeringId))) return;

            const assignments = await Assignment.findAll({
                where: { courseOfferingId: req.params.offeringId },
                include: [{
                    model: AssignmentSubmission, as: 'submissions',
                    where: { studentId: student.id }, required: false
                }],
                order: [['dueDate', 'ASC']]
            });

            const offering = await CourseOffering.findByPk(req.params.offeringId, {
                include: [{ model: Course, as: 'course' }]
            });

            const data = assignments.map(a => ({
                id: a.id, assignmentNumber: a.assignmentNumber, title: a.title, description: a.description,
                totalMarks: a.totalMarks, dueDate: a.dueDate, createdAt: a.createdAt, updatedAt: a.updatedAt,
                submitted: a.submissions && a.submissions.some(s => s.status !== 'draft'),
                submission: a.submissions?.[0] ? {
                    id: a.submissions[0].id, status: a.submissions[0].status,
                    marksAwarded: a.submissions[0].marksAwarded,
                    submittedAt: a.submissions[0].submittedAt,
                    submissionFile: a.submissions[0].submissionFile
                } : null
            }));

            return res.json({ success: true, data, course: { name: offering?.course?.name, code: offering?.course?.code } });
        } catch (error) {
            console.error('Get student assignments error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch assignments' });
        }
    }
);

// Route moved to top for conflict resolution

router.post(
    '/assignments/:id/draft',
    requireAuth, requireRole('student'),
    // Accept files from any field name (some clients may send `files[]` or other names).
    // Multer is limited to 10 files by the `limits.files` option above.
    upload.any(),
    async (req, res) => {
        try {
            const student = await getCurrentStudent(req);
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const assignment = await Assignment.findByPk(req.params.id);
            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (!await ensureStudentEnrollment(req, res, student.id, assignment.courseOfferingId)) {
                if (req.files) for (const f of req.files) safeUnlink(f.path);
                return;
            }

            if (!req.files || req.files.length === 0)
                return res.status(400).json({ success: false, error: 'Please upload at least one file' });

            let submission = await AssignmentSubmission.findOne({ where: { assignmentId: assignment.id, studentId: student.id } });
            if (submission && submission.status !== 'draft') {
                for (const f of req.files) safeUnlink(f.path);
                return res.status(409).json({ success: false, error: 'You have already submitted this assignment' });
            }

            const filenames = req.files.map(f => f.filename);
            const currentFiles = submission ? (Array.isArray(submission.submissionFile) ? submission.submissionFile : []) : [];

            const getOriginalName = (fname) => {
                const dash1 = fname.indexOf('-');
                const dash2 = fname.indexOf('-', dash1 + 1);
                return fname.substring(dash2 + 1).toLowerCase();
            };

            const existingOriginalNames = currentFiles.map(f => getOriginalName(f));
            let filesToKeep = [...currentFiles];

            for (const file of req.files) {
                const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
                const existingIndex = existingOriginalNames.indexOf(safeName);
                if (existingIndex !== -1) {
                    // File exists, delete the old physical file to replace it
                    const fileToRemove = currentFiles[existingIndex];
                    safeUnlink(path.join(uploadDir, fileToRemove));
                    filesToKeep = filesToKeep.filter(f => f !== fileToRemove);
                }
            }

            if (submission) {
                submission.submissionFile = [...filesToKeep, ...filenames];
                await submission.save();
            } else {
                submission = await AssignmentSubmission.create({
                    assignmentId: assignment.id, studentId: student.id,
                    submissionFile: filenames, status: 'draft'
                });
            }
            return res.status(200).json({ success: true, data: submission });
        } catch (error) {
            console.error('Draft assignment error:', error);
            if (req.files) for (const f of req.files) safeUnlink(f.path);
            return res.status(500).json({ success: false, error: 'Failed to draft assignment' });
        }
    }
);

router.delete(
    '/assignments/:id/draft/:filename',
    requireAuth, requireRole('student'),
    async (req, res) => {
        try {
            const student = await getCurrentStudent(req);
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const assignment = await Assignment.findByPk(req.params.id, { attributes: ['id', 'courseOfferingId'] });
            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (!await ensureStudentEnrollment(req, res, student.id, assignment.courseOfferingId)) return;

            const submission = await AssignmentSubmission.findOne({ where: { assignmentId: assignment.id, studentId: student.id } });

            if (!submission) {
                return res.status(404).json({ success: false, error: 'Submission record not found' });
            }
            if (submission.status !== 'draft') {
                return res.status(400).json({ success: false, error: `Cannot remove file from ${submission.status} submission` });
            }

            let currentFiles = Array.isArray(submission.submissionFile) ? submission.submissionFile : [];
            const target = req.params.filename;

            // FIX: path.basename prevents path traversal attacks (e.g. ../../etc/passwd)
            const safeTarget = path.basename(target);
            if (!currentFiles.includes(safeTarget)) {
                return res.status(404).json({ success: false, error: 'File not found in your draft list' });
            }

            submission.submissionFile = currentFiles.filter(f => f !== safeTarget);
            await submission.save();
            safeUnlink(path.join(uploadDir, safeTarget));
            return res.json({ success: true, data: submission });
        } catch (error) {
            console.error('Delete drafted file error:', error);
            return res.status(500).json({ success: false, error: 'Failed to delete file' });
        }
    }
);

router.post(
    '/assignments/:id/submit',
    requireAuth, requireRole('student'),
    async (req, res) => {
        try {
            const student = await getCurrentStudent(req);
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const assignment = await Assignment.findByPk(req.params.id);
            if (!assignment) return res.status(404).json({ success: false, error: 'Assignment not found' });
            if (!await ensureStudentEnrollment(req, res, student.id, assignment.courseOfferingId)) return;

            const submission = await AssignmentSubmission.findOne({ where: { assignmentId: assignment.id, studentId: student.id } });
            if (!submission) return res.status(404).json({ success: false, error: 'Draft submission not found' });
            if (submission.status !== 'draft')
                return res.status(409).json({ success: false, error: 'You have already submitted this assignment' });

            // FIX: also check the draft has at least one file before allowing submission
            if (!submission.submissionFile || submission.submissionFile.length === 0)
                return res.status(400).json({ success: false, error: 'Cannot submit an empty draft — please attach at least one file' });

            submission.status = 'submitted';
            submission.submittedAt = new Date();
            await submission.save();
            return res.status(200).json({ success: true, data: submission });
        } catch (error) {
            console.error('Submit assignment error:', error);
            return res.status(500).json({ success: false, error: 'Failed to submit assignment' });
        }
    }
);

// ── File download/preview (authz enforced per submission ownership) ──────────

router.get(
    '/submissions/:filename/download',
    requireAuth,
    async (req, res) => {
        try {
            // FIX: path.basename already applied — prevents path traversal
            const filename = path.basename(req.params.filename);
            const filePath = path.join(uploadDir, filename);
            const allowed = await canAccessSubmissionFile(req, filename);
            if (!allowed) {
                return res.status(403).json({ success: false, error: 'Access denied: you cannot access this file' });
            }

            if (!fs.existsSync(filePath))
                return res.status(404).json({ success: false, error: 'File not found' });

            if (req.query.inline === 'true') {
                // FIX: set the correct Content-Type so browsers / react-pdf / mammoth
                // can interpret the file properly (was missing — caused some parsers to fail).
                const mimeType = mime.lookup(filename) || 'application/octet-stream';
                res.setHeader('Content-Type', mimeType);
                // Secure against stored XSS by setting a sandboxed CSP for inline previews.
                // This prevents scripts, forms, and other active content from executing in our origin.
                res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox;");
                return res.sendFile(filePath);
            }

            // Force download with original filename stripped of the timestamp prefix
            const parts = filename.split('-');
            const displayName = parts.length >= 3 ? parts.slice(2).join('-') : filename;
            return res.download(filePath, displayName);
        } catch (error) {
            console.error('Download error:', error);
            return res.status(500).json({ success: false, error: 'Failed to download file' });
        }
    }
);

router.get(
    '/submissions/:filename/preview',
    requireAuth,
    async (req, res) => {
        try {
            const filename = path.basename(req.params.filename);
            const filePath = path.join(uploadDir, filename);
            const allowed = await canAccessSubmissionFile(req, filename);
            if (!allowed) {
                return res.status(403).json({ success: false, error: 'Access denied: you cannot access this file' });
            }

            if (!fs.existsSync(filePath))
                return res.status(404).json({ success: false, error: 'File not found' });

            const ext = path.extname(filename).toLowerCase();
            if (ext === '.zip') {
                try {
                    const zip = new AdmZip(filePath);
                    const files = zip.getEntries()
                        .map(e => ({ name: e.entryName, size: e.header.size, isDirectory: e.isDirectory }))
                        .filter(f => !f.isDirectory && !f.name.startsWith('__MACOSX/'));
                    return res.json({ success: true, type: 'zip', data: files });
                } catch {
                    return res.status(500).json({ success: false, error: 'Failed to parse zip file' });
                }
            }
            return res.json({ success: true, type: ext.substring(1) });
        } catch (error) {
            console.error('Preview error:', error);
            return res.status(500).json({ success: false, error: 'Failed to fetch file preview' });
        }
    }
);

router.delete(
    '/assignments/submissions/:id/unsubmit',
    requireAuth, requireRole('student'),
    async (req, res) => {
        try {
            const student = await Student.findOne({ where: { userId: req.user.id } });
            if (!student) return res.status(404).json({ success: false, error: 'Student not found' });

            const submission = await AssignmentSubmission.findByPk(req.params.id, {
                include: [{ model: Assignment, as: 'assignment' }]
            });
            if (!submission) return res.status(404).json({ success: false, error: 'Submission not found' });
            if (submission.studentId !== student.id)
                return res.status(403).json({ success: false, error: 'You can only unsubmit your own work' });

            if (submission.status === 'graded') {
                return res.status(400).json({ success: false, error: 'Cannot unsubmit a graded assignment' });
            }

            submission.status = 'draft';
            submission.marksAwarded = null;
            submission.gradedAt = null;
            submission.gradedBy = null;

            await submission.save();
            return res.json({ success: true, message: 'Assignment unsubmitted successfully' });
        } catch (error) {
            console.error('Unsubmit error:', error);
            return res.status(500).json({ success: false, error: 'Failed to unsubmit assignment' });
        }
    }
);

module.exports = router;
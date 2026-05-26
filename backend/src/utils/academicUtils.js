const { Student, StudentCourse, CourseOffering, Course } = require('../models');

/**
 * Recalculates CGPA and Earned Credits for a student and updates their record.
 * Only approved grades are considered.
 */
async function recalculateStudentGPA(studentId, transaction = null) {
    const student = await Student.findByPk(studentId, { transaction });
    if (!student) return null;

    // Fetch all student courses with approved offerings
    const courses = await StudentCourse.findAll({
        where: { studentId: student.id },
        include: [
            {
                model: CourseOffering,
                where: { resultStatus: 'approved' },
                include: [{ model: Course, as: 'course' }]
            }
        ],
        transaction
    });

    // 1. Identify Best Attempts for CGPA
    const bestAttempts = {};
    let earnedCredits = 0;

    courses.forEach(record => {
        if (record.grade === 'W' || record.grade === 'I') return;

        const courseCode = record.CourseOffering.course.code;
        const points = parseFloat(record.gradePoints) || 0;
        const credits = parseFloat(record.CourseOffering.course.credits) || 0;

        // Best attempt logic (replace if higher points)
        if (!bestAttempts[courseCode] || points > bestAttempts[courseCode].points) {
            bestAttempts[courseCode] = {
                points: points,
                credits: credits
            };
        }

        // Earned credits (passed courses)
        if (record.grade !== 'F' && record.grade !== 'W' && record.grade !== 'I' && record.grade !== 'P') {
            // Note: If your system uses 'P' for pass without points, handle it here.
            earnedCredits += credits;
        } else if (record.grade === 'P') {
            earnedCredits += credits;
        }
    });

    // 2. Calculate CGPA
    let totalQualityPoints = 0;
    let totalGPAHours = 0;

    Object.values(bestAttempts).forEach(attempt => {
        totalQualityPoints += (attempt.credits * attempt.points);
        totalGPAHours += attempt.credits;
    });

    const cgpa = totalGPAHours > 0 ? (totalQualityPoints / totalGPAHours).toFixed(2) : '0.00';

    // 3. Update Student Record
    await student.update({
        cgpa: parseFloat(cgpa),
        earnedCredits
    }, { transaction });

    return { cgpa, earnedCredits };
}

module.exports = { recalculateStudentGPA };

-- ============================================================
--  Course Management System (CMS) — performance.sql
--  Authors : Toheed Ali (BSCS24119), Taha Qureshi (BSCS24093)
--  Course  : Advance Database and Management System — 4th Semester
--  Instructor: Ms. Mamoona Tassaduq
-- ============================================================
--  Demonstrates EXPLAIN ANALYZE before and after adding indexes
--  for 3 real-world queries on universityPortalDB.
-- ============================================================

USE universityPortalDB;

-- ============================================================
-- QUERY 1: Find attendance percentage for each student in each course
-- ============================================================

-- DROP extra indexes if re-running this script
DROP INDEX IF EXISTS idx_att_student_lecture  ON attendances;
DROP INDEX IF EXISTS idx_sc_student_sem       ON student_courses;
DROP INDEX IF EXISTS idx_asub_student_assign  ON assignment_submissions;

-- BEFORE: no extra composite index
EXPLAIN
SELECT
    s.rollNumber, 
    CONCAT(u.firstName, ' ', u.lastName) AS studentName,
    c.code AS courseCode,
    COUNT(a.id) AS totalLectures,
    SUM(a.status = 'present') AS attended,
    ROUND(SUM(a.status = 'present') / COUNT(a.id) * 100, 2) AS attendancePct
FROM attendances a
JOIN lectures l ON a.lectureId = l.id
JOIN course_offerings co ON l.offeringId = co.id
JOIN courses c ON co.courseId = c.id
JOIN students s ON a.studentId = s.id
JOIN users u ON s.userId = u.id
GROUP BY s.id, co.id
ORDER BY s.rollNumber, co.id;

-- CREATE composite index
-- Covers (studentId, lectureId) for the join + filter in attendances
CREATE INDEX idx_att_student_lecture ON attendances (studentId, lectureId);

-- AFTER: with composite index
EXPLAIN
SELECT
    s.rollNumber,
    CONCAT(u.firstName, ' ', u.lastName) AS studentName,
    c.code AS courseCode,
    COUNT(a.id) AS totalLectures,
    SUM(a.status = 'present') AS attended,
    ROUND(SUM(a.status = 'present') / COUNT(a.id) * 100, 2) AS attendancePct
FROM attendances a
JOIN lectures l ON a.lectureId = l.id
JOIN course_offerings co ON l.offeringId = co.id
JOIN courses c ON co.courseId = c.id
JOIN students s ON a.studentId = s.id
JOIN users u ON s.userId = u.id
GROUP BY s.id, co.id
ORDER BY s.rollNumber, co.id;


-- ============================================================
-- QUERY 2: List all enrolled courses for a specific student
-- ============================================================

-- BEFORE: only base indexes exist
EXPLAIN
SELECT
    sc.studentId, co.semester, c.code AS courseCode,
    c.name AS courseName, c.credits, sc.status,
    sc.grade, sc.gradePoints
FROM student_courses sc
JOIN course_offerings co ON sc.courseOfferingId = co.id
JOIN courses c ON co.courseId = c.id
WHERE sc.studentId = 1 AND sc.status IN ('enrolled', 'completed')
ORDER BY co.semester, c.code;

-- CREATE composite index
-- Covers (studentId, status) so the WHERE clause is index-only
CREATE INDEX idx_sc_student_sem ON student_courses (studentId, status);

-- AFTER: with composite index
EXPLAIN
SELECT
    sc.studentId, co.semester, c.code AS courseCode,
    c.name AS courseName, c.credits, sc.status,
    sc.grade, sc.gradePoints
FROM student_courses sc
JOIN course_offerings co ON sc.courseOfferingId = co.id
JOIN courses c ON co.courseId = c.id
WHERE sc.studentId = 1 AND sc.status IN ('enrolled', 'completed')
ORDER BY co.semester, c.code;


-- ============================================================
-- QUERY 3: Assignment submission report: marks, status, late submissions
-- ============================================================

-- BEFORE: only base indexes exist
EXPLAIN
SELECT
    a.id AS assignmentId, a.title, c.code AS courseCode,
    CONCAT(u.firstName, ' ', u.lastName) AS studentName,
    s.rollNumber, asub.marksAwarded, a.totalMarks,
    asub.status AS submissionStatus, asub.submittedAt, a.dueDate
FROM assignment_submissions asub
JOIN assignments a ON asub.assignmentId = a.id
JOIN course_offerings co ON a.courseOfferingId = co.id
JOIN courses c ON co.courseId = c.id
JOIN students s ON asub.studentId = s.id
JOIN users u ON s.userId = u.id
WHERE a.courseOfferingId IN (5, 6, 7, 8)   -- Fall 2024 CS offerings
ORDER BY a.id, s.rollNumber;

-- CREATE composite index
-- Covers (studentId, assignmentId) for the join in submissions
CREATE INDEX idx_asub_student_assign ON assignment_submissions (studentId, assignmentId);

-- AFTER: with composite index
EXPLAIN
SELECT
    a.id AS assignmentId,
    a.title,
    c.code AS courseCode,
    CONCAT(u.firstName, ' ', u.lastName) AS studentName,
    s.rollNumber,
    asub.marksAwarded,
    a.totalMarks,
    asub.status AS submissionStatus,
    asub.submittedAt,
    a.dueDate
FROM assignment_submissions asub
JOIN assignments a ON asub.assignmentId = a.id
JOIN course_offerings co ON a.courseOfferingId = co.id
JOIN courses c ON co.courseId = c.id
JOIN students s ON asub.studentId = s.id
JOIN users u ON s.userId = u.id
WHERE a.courseOfferingId IN (5, 6, 7, 8)
ORDER BY a.id, s.rollNumber;


-- ============================================================
-- SUMMARY OF INDEXES ADDED
-- ============================================================
-- idx_att_student_lecture   attendances(studentId, lectureId)
--   Query 1: speeds up attendance join & group-by per student
--
-- idx_sc_student_sem        student_courses(studentId, status)
--   Query 2: eliminates full-table scan for per-student lookups
--
-- idx_asub_student_assign   assignment_submissions(studentId, assignmentId)
--   Query 3: accelerates submission join when filtering by offering
-- ============================================================

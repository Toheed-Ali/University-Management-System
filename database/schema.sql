-- ============================================================
--  Course Management System (CMS) — schema.sql
--  By : Toheed Ali (BSCS24119), Taha Qureshi (BSCS24093)
--  Course  : Advance Database and Management System — 4th Semester
--  Instructor: Ms. Mamoona Tassaduq
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP DATABASE IF EXISTS universityPortalDB;
CREATE DATABASE universityPortalDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_general_ci;
USE universityPortalDB;
SET FOREIGN_KEY_CHECKS = 1;

-- TABLE 1: INSTITUTION
CREATE TABLE institution (
    id                           INT            NOT NULL AUTO_INCREMENT,
    name                         VARCHAR(255)   NOT NULL,
    shortName                    VARCHAR(50)    NULL,
    city                         VARCHAR(100)   NULL,
    province                     VARCHAR(100)   NULL,
    country                      VARCHAR(100)   NOT NULL DEFAULT 'Pakistan',
    email                        VARCHAR(255)   NOT NULL DEFAULT 'admin@itu.edu.pk',
    address                      VARCHAR(500)   NULL     DEFAULT 'Lahore, Punjab, Pakistan',
    registrationStartDate        DATETIME       NULL,
    registrationEndDate          DATETIME       NULL,
    createdAt                    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt                    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_institution            PRIMARY KEY (id),
    CONSTRAINT chk_institution_reg_dates CHECK (registrationEndDate IS NULL
                                             OR registrationStartDate IS NULL
                                             OR registrationEndDate > registrationStartDate)
);

-- TABLE 2: USERS
CREATE TABLE users (
    id           INT                                                NOT NULL AUTO_INCREMENT,
    firstName    VARCHAR(100)                                       NOT NULL,
    lastName     VARCHAR(100)                                       NOT NULL,
    email        VARCHAR(255)                                       NOT NULL,
    passwordHash VARCHAR(255)                                       NOT NULL,
    role         ENUM('admin','teacher','student')                  NOT NULL DEFAULT 'admin',
    status       ENUM('active','inactive','suspended','graduated')  NOT NULL DEFAULT 'active',
    lastLogin    DATETIME                                           NULL,
    tokenVersion INT                                                NOT NULL DEFAULT 1,
    createdAt    DATETIME                                           NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME                                           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_users               PRIMARY KEY (id),
    CONSTRAINT uq_users_email         UNIQUE (email),
    CONSTRAINT chk_users_tokenVersion CHECK (tokenVersion >= 1),
    INDEX idx_users_role   (role),
    INDEX idx_users_status (status)
);

-- TABLE 3: DEPARTMENTS
CREATE TABLE departments (
    id                    INT                        NOT NULL AUTO_INCREMENT,
    institutionId         INT                        NOT NULL,
    name                  VARCHAR(255)               NOT NULL,
    code                  VARCHAR(50)                NOT NULL,
    degreeTitle           VARCHAR(255)               NOT NULL,
    totalCreditHours      INT                        NOT NULL DEFAULT 0,
    maxCreditsPerSemester INT                        NOT NULL DEFAULT 18,
    headOfDepartment      INT                        NULL,
    status                ENUM('active','inactive')  NOT NULL DEFAULT 'active',
    createdAt             DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt             DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_departments              PRIMARY KEY (id),
    CONSTRAINT uq_departments_name        UNIQUE (name),
    CONSTRAINT uq_departments_code        UNIQUE (code),
    CONSTRAINT chk_departments_credits    CHECK (totalCreditHours >= 0),
    CONSTRAINT chk_departments_max_cred   CHECK (maxCreditsPerSemester > 0
                                                AND maxCreditsPerSemester <= totalCreditHours),
    INDEX idx_departments_institutionId      (institutionId),
    INDEX idx_departments_headOfDepartment   (headOfDepartment),
    INDEX idx_departments_status             (status)
);

-- TABLE 4: TEACHERS
CREATE TABLE teachers (
    id             INT                            NOT NULL AUTO_INCREMENT,
    userId         INT                            NOT NULL,
    employeeId     VARCHAR(50)                    NOT NULL,
    cnic           VARCHAR(20)                    NOT NULL,
    joiningDate    DATE                           NOT NULL,
    dateOfBirth    DATE                           NULL,
    gender         ENUM('male','female','other')  NULL,
    nationality    VARCHAR(50)                    NULL,
    religion       VARCHAR(50)                    NULL,
    employmentType ENUM('permanent','visiting')   NOT NULL DEFAULT 'permanent',
    phone          VARCHAR(20)                    NULL,
    createdAt      DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt      DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_teachers           PRIMARY KEY (id),
    CONSTRAINT uq_teachers_userId    UNIQUE (userId),
    CONSTRAINT uq_teachers_empId     UNIQUE (employeeId),
    CONSTRAINT uq_teachers_cnic      UNIQUE (cnic),
    CONSTRAINT chk_teachers_dob      CHECK (dateOfBirth IS NULL OR dateOfBirth < joiningDate)
);

-- TABLE 5: BATCHES
CREATE TABLE batches (
    id           INT                        NOT NULL AUTO_INCREMENT,
    name         VARCHAR(255)               NOT NULL,
    departmentId INT                        NOT NULL,
    year         INT                        NOT NULL,
    status       ENUM('active','inactive')  NOT NULL DEFAULT 'active',
    createdAt    DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_batches         PRIMARY KEY (id),
    CONSTRAINT chk_batches_year   CHECK (year >= 2000),
    INDEX idx_batches_departmentId   (departmentId),
    INDEX idx_batches_name_dept      (name, departmentId)
);

-- TABLE 6: SECTIONS
CREATE TABLE sections (
    id           INT                        NOT NULL AUTO_INCREMENT,
    name         VARCHAR(255)               NOT NULL,
    departmentId INT                        NOT NULL,
    batchId      INT                        NOT NULL,
    status       ENUM('active','inactive')  NOT NULL DEFAULT 'active',
    createdAt    DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_sections PRIMARY KEY (id),
    INDEX idx_sections_departmentId (departmentId),
    INDEX idx_sections_batchId      (batchId)
);

-- TABLE 7: STUDENTS
CREATE TABLE students (
    id                    INT                            NOT NULL AUTO_INCREMENT,
    userId                INT                            NOT NULL,
    rollNumber            VARCHAR(50)                    NOT NULL,
    batchId               INT                            NOT NULL,
    departmentId          INT                            NOT NULL,
    sectionId             INT                            NOT NULL,
    semester              INT                            NOT NULL DEFAULT 1,
    cgpa                  DECIMAL(3,2)                   NOT NULL DEFAULT 0.00,
    totalCredits          INT                            NOT NULL DEFAULT 0,
    earnedCredits         INT                            NOT NULL DEFAULT 0,
    dateOfBirth           DATE                           NULL,
    gender                ENUM('male','female','other')  NULL,
    nationality           VARCHAR(100)                   NULL,
    religion              VARCHAR(50)                    NULL,
    fatherName            VARCHAR(100)                   NULL,
    cnic                  VARCHAR(20)                    NULL,
    phone                 VARCHAR(20)                    NULL,
    registrationStartDate DATETIME                       NULL,
    registrationEndDate   DATETIME                       NULL,
    createdAt             DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt             DATETIME                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_students              PRIMARY KEY (id),
    CONSTRAINT uq_students_userId       UNIQUE (userId),
    CONSTRAINT uq_students_rollNumber   UNIQUE (rollNumber),
    CONSTRAINT uq_students_cnic         UNIQUE (cnic),
    CONSTRAINT chk_students_semester    CHECK (semester >= 1),
    CONSTRAINT chk_students_cgpa        CHECK (cgpa >= 0.00 AND cgpa <= 4.00),
    CONSTRAINT chk_students_totalCred   CHECK (totalCredits >= 0),
    CONSTRAINT chk_students_earnedCred  CHECK (earnedCredits >= 0),
    INDEX idx_students_batchId       (batchId),
    INDEX idx_students_departmentId  (departmentId),
    INDEX idx_students_sectionId     (sectionId),
    INDEX idx_students_semester      (semester)
);

-- TABLE 8: COURSES
CREATE TABLE courses (
    id           INT                                      NOT NULL AUTO_INCREMENT,
    departmentId INT                                      NOT NULL,
    code         VARCHAR(50)                              NOT NULL,
    name         VARCHAR(255)                             NOT NULL,
    credits      INT                                      NOT NULL DEFAULT 3,
    status       ENUM('active','inactive')                NOT NULL DEFAULT 'active',
    createdAt    DATETIME                                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME                                 NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_courses          PRIMARY KEY (id),
    CONSTRAINT uq_courses_code     UNIQUE (code),
    CONSTRAINT chk_courses_credits CHECK (credits > 0),
    INDEX idx_courses_departmentId (departmentId),
    INDEX idx_courses_status       (status)
);

-- TABLE 9: COURSE_OFFERINGS
CREATE TABLE course_offerings (
    id           INT                                               NOT NULL AUTO_INCREMENT,
    courseId     INT                                               NOT NULL,
    teacherId    INT                                               NULL,
    departmentId INT                                               NOT NULL,
    batchId      INT                                               NOT NULL,
    sectionId    INT                                               NOT NULL,
    semester     INT                                               NOT NULL,
    maxSeats     INT                                               NOT NULL DEFAULT 50,
    enrolledCount INT                                              NOT NULL DEFAULT 0,
    status       ENUM('active','inactive','completed')             NOT NULL DEFAULT 'active',
    resultStatus ENUM('pending','submitted','approved','rejected') NOT NULL DEFAULT 'pending',
    submittedAt  DATETIME                                          NULL,
    createdAt    DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt    DATETIME                                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_course_offerings      PRIMARY KEY (id),
    CONSTRAINT chk_co_semester          CHECK (semester >= 1),
    INDEX idx_co_courseId               (courseId),
    INDEX idx_co_teacherId              (teacherId),
    INDEX idx_co_departmentId           (departmentId),
    INDEX idx_co_batchId                (batchId),
    INDEX idx_co_sectionId              (sectionId),
    INDEX idx_co_semester               (semester),
    INDEX idx_co_batch_section_sem      (batchId, sectionId, semester)
);

-- TABLE 10: STUDENT_COURSES
CREATE TABLE student_courses (
    id               INT                                                                    NOT NULL AUTO_INCREMENT,
    studentId        INT                                                                    NOT NULL,
    courseOfferingId INT                                                                    NOT NULL,
    status           ENUM('pending','enrolled','rejected','dropped','completed','failed')   NOT NULL DEFAULT 'pending',
    grade            VARCHAR(5)                                                             NULL,
    enrollmentDate   DATETIME                                                               NULL,
    gradePoints      DECIMAL(3,2)                                                           NOT NULL DEFAULT 0.00,
    createdAt        DATETIME                                                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt        DATETIME                                                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_student_courses       PRIMARY KEY (id),
    CONSTRAINT chk_sc_gradePoints       CHECK (gradePoints >= 0 AND gradePoints <= 4.00),
    CONSTRAINT chk_sc_grade             CHECK (grade IS NULL OR grade IN ('A+','A','A-','B+','B','B-','C+','C','C-','D+','D','D-','F','P','W')),
    INDEX idx_sc_studentId              (studentId),
    INDEX idx_sc_courseOfferingId       (courseOfferingId),
    INDEX idx_sc_student_offering       (studentId, courseOfferingId)
);

-- TABLE 11: LECTURES
CREATE TABLE lectures (
    id            INT           NOT NULL AUTO_INCREMENT,
    offeringId    INT           NOT NULL,
    lectureNumber INT           NOT NULL,
    lectureDate   DATE          NOT NULL,
    topic         VARCHAR(255)  NULL,
    createdBy     INT           NOT NULL,
    createdAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_lectures              PRIMARY KEY (id),
    CONSTRAINT chk_lectures_number      CHECK (lectureNumber > 0),
    INDEX idx_lectures_offeringId       (offeringId),
    INDEX idx_lectures_lectureDate      (lectureDate),
    INDEX idx_lectures_createdBy        (createdBy)
);

-- TABLE 12: ATTENDANCES
CREATE TABLE attendances (
    id        INT                       NOT NULL AUTO_INCREMENT,
    lectureId INT                       NOT NULL,
    studentId INT                       NOT NULL,
    status    ENUM('present','absent')  NOT NULL DEFAULT 'absent',
    markedBy  INT                       NULL,
    markedAt  DATETIME                  NULL,
    createdAt DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME                  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_attendances           PRIMARY KEY (id),
    INDEX idx_att_lectureId             (lectureId),
    INDEX idx_att_studentId             (studentId),
    INDEX idx_att_lecture_student       (lectureId, studentId)
);

-- TABLE 13: ASSIGNMENTS
CREATE TABLE assignments (
    id               INT                        NOT NULL AUTO_INCREMENT,
    courseOfferingId INT                        NOT NULL,
    assignmentNumber INT                        NOT NULL,
    title            VARCHAR(255)               NOT NULL,
    description      TEXT                       NULL,
    totalMarks       INT                        NOT NULL,
    dueDate          DATETIME                   NOT NULL,
    createdBy        INT                        NOT NULL,
    createdAt        DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt        DATETIME                   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    plagiarismReportUrl VARCHAR(255)               NULL,
    plagiarismThreshold INT                        NOT NULL DEFAULT 50,
    plagiarismMatchCount INT                       NOT NULL DEFAULT 0,

    CONSTRAINT pk_assignments          PRIMARY KEY (id),
    CONSTRAINT chk_assignments_marks   CHECK (totalMarks > 0),
    INDEX idx_assign_courseOfferingId  (courseOfferingId),
    INDEX idx_assign_createdBy         (createdBy)
);

-- TABLE 14: ASSIGNMENT_SUBMISSIONS
CREATE TABLE assignment_submissions (
    id             INT                                    NOT NULL AUTO_INCREMENT,
    assignmentId   INT                                    NOT NULL,
    studentId      INT                                    NOT NULL,
    submissionFile TEXT                                   NOT NULL,
    submittedAt    DATETIME                               NOT NULL,
    marksAwarded   INT                                    NULL,
    status         ENUM('draft','submitted','graded','late') NOT NULL DEFAULT 'draft',
    gradedBy       INT                                    NULL,
    gradedAt       DATETIME                               NULL,
    createdAt      DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt      DATETIME                               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_assignment_submissions   PRIMARY KEY (id),
    CONSTRAINT chk_asub_marks             CHECK (marksAwarded IS NULL OR marksAwarded >= 0),
    INDEX idx_asub_assignmentId            (assignmentId),
    INDEX idx_asub_studentId              (studentId),
    INDEX idx_asub_assign_student         (assignmentId, studentId)
);

-- ============================================================
-- FOREIGN KEY CONSTRAINTS
-- ============================================================

-- departments → institution
ALTER TABLE departments
    ADD CONSTRAINT fk_dept_institution
        FOREIGN KEY (institutionId)    REFERENCES institution(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_dept_hod
        FOREIGN KEY (headOfDepartment) REFERENCES teachers(id)    ON DELETE SET NULL;

-- teachers → users
ALTER TABLE teachers
    ADD CONSTRAINT fk_teachers_user
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- batches → departments
ALTER TABLE batches
    ADD CONSTRAINT fk_batches_dept
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT;

-- sections → departments, batches
ALTER TABLE sections
    ADD CONSTRAINT fk_sections_dept
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_sections_batch
        FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE RESTRICT;

-- students → users, batches, departments, sections
ALTER TABLE students
    ADD CONSTRAINT fk_students_user
        FOREIGN KEY (userId)       REFERENCES users(id)       ON DELETE CASCADE,
    ADD CONSTRAINT fk_students_batch
        FOREIGN KEY (batchId)      REFERENCES batches(id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_students_dept
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_students_section
        FOREIGN KEY (sectionId)    REFERENCES sections(id)    ON DELETE RESTRICT;

-- courses → departments
ALTER TABLE courses
    ADD CONSTRAINT fk_courses_dept
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT;

-- course_offerings → courses, teachers, departments, batches, sections
ALTER TABLE course_offerings
    ADD CONSTRAINT fk_co_course
        FOREIGN KEY (courseId)     REFERENCES courses(id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_co_teacher
        FOREIGN KEY (teacherId)    REFERENCES teachers(id)    ON DELETE SET NULL,
    ADD CONSTRAINT fk_co_dept
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_co_batch
        FOREIGN KEY (batchId)      REFERENCES batches(id)     ON DELETE RESTRICT,
    ADD CONSTRAINT fk_co_section
        FOREIGN KEY (sectionId)    REFERENCES sections(id)    ON DELETE RESTRICT;

-- student_courses → students, course_offerings
ALTER TABLE student_courses
    ADD CONSTRAINT fk_sc_student
        FOREIGN KEY (studentId)        REFERENCES students(id)        ON DELETE CASCADE,
    ADD CONSTRAINT fk_sc_offering
        FOREIGN KEY (courseOfferingId) REFERENCES course_offerings(id) ON DELETE RESTRICT;

-- lectures → course_offerings, teachers
ALTER TABLE lectures
    ADD CONSTRAINT fk_lectures_offering
        FOREIGN KEY (offeringId) REFERENCES course_offerings(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_lectures_teacher
        FOREIGN KEY (createdBy)  REFERENCES teachers(id)         ON DELETE RESTRICT;

-- attendances → lectures, students, teachers
ALTER TABLE attendances
    ADD CONSTRAINT fk_att_lecture
        FOREIGN KEY (lectureId) REFERENCES lectures(id)  ON DELETE CASCADE,
    ADD CONSTRAINT fk_att_student
        FOREIGN KEY (studentId) REFERENCES students(id)  ON DELETE CASCADE,
    ADD CONSTRAINT fk_att_teacher
        FOREIGN KEY (markedBy)  REFERENCES teachers(id)  ON DELETE SET NULL;

-- assignments → course_offerings, teachers
ALTER TABLE assignments
    ADD CONSTRAINT fk_assign_offering
        FOREIGN KEY (courseOfferingId) REFERENCES course_offerings(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_assign_teacher
        FOREIGN KEY (createdBy) REFERENCES teachers(id) ON DELETE RESTRICT;

-- assignment_submissions → assignments, students, teachers
ALTER TABLE assignment_submissions
    ADD CONSTRAINT fk_asub_assignment
        FOREIGN KEY (assignmentId) REFERENCES assignments(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_asub_student
        FOREIGN KEY (studentId)    REFERENCES students(id)    ON DELETE CASCADE,
    ADD CONSTRAINT fk_asub_grader
        FOREIGN KEY (gradedBy)     REFERENCES teachers(id)    ON DELETE SET NULL;

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- TRIGGER 1: trg_update_cgpa_after_grade
-- After a student's grade is updated in student_courses,
-- automatically recalculate their CGPA and earnedCredits.
CREATE TRIGGER trg_update_cgpa_after_grade
AFTER UPDATE ON student_courses
FOR EACH ROW
BEGIN
    DECLARE v_totalWeighted DECIMAL(10,2) DEFAULT 0;
    DECLARE v_totalCredits  INT           DEFAULT 0;
    DECLARE v_newCGPA       DECIMAL(3,2)  DEFAULT 0.00;
    DECLARE v_earnedCredits INT           DEFAULT 0;

    -- Only recalculate when gradePoints actually changed
    IF NEW.gradePoints != OLD.gradePoints AND NEW.status = 'completed' THEN

        -- Sum weighted grade points for all completed courses of this student
        SELECT
            SUM(c.credits * sc.gradePoints),
            SUM(c.credits)
        INTO v_totalWeighted, v_totalCredits
        FROM student_courses sc
        JOIN course_offerings co ON sc.courseOfferingId = co.id
        JOIN courses c           ON co.courseId         = c.id
        WHERE sc.studentId = NEW.studentId
          AND sc.status    = 'completed';

        -- Sum credits for passed courses (grade not F or W)
        SELECT SUM(c.credits)
        INTO v_earnedCredits
        FROM student_courses sc
        JOIN course_offerings co ON sc.courseOfferingId = co.id
        JOIN courses c           ON co.courseId         = c.id
        WHERE sc.studentId = NEW.studentId
          AND sc.status    = 'completed'
          AND sc.grade NOT IN ('F','W');

        -- Guard against NULL / division by zero
        IF v_totalCredits > 0 THEN
            SET v_newCGPA = ROUND(v_totalWeighted / v_totalCredits, 2);
        END IF;

        SET v_earnedCredits = IFNULL(v_earnedCredits, 0);

        UPDATE students
        SET cgpa          = v_newCGPA,
            earnedCredits = v_earnedCredits,
            updatedAt     = NOW()
        WHERE id = NEW.studentId;

    END IF;
END$$


-- TRIGGER 2: trg_prevent_duplicate_enrollment
-- Before inserting into student_courses, check that the
-- student is not already enrolled in the same offering.
CREATE TRIGGER trg_prevent_duplicate_enrollment
BEFORE INSERT ON student_courses
FOR EACH ROW
BEGIN
    DECLARE v_count INT DEFAULT 0;

    SELECT COUNT(*) INTO v_count
    FROM student_courses
    WHERE studentId        = NEW.studentId
      AND courseOfferingId = NEW.courseOfferingId
      AND status NOT IN ('rejected','dropped');

    IF v_count > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is already enrolled or has a pending enrollment for this course offering.';
    END IF;
END$$


-- TRIGGER 3: trg_check_credit_limit_before_enroll
-- Before enrolling, ensure the student's enrolled credits
-- for the semester do not exceed the department cap.
CREATE TRIGGER trg_check_credit_limit_before_enroll
BEFORE INSERT ON student_courses
FOR EACH ROW
BEGIN
    DECLARE v_enrolledCredits   INT DEFAULT 0;
    DECLARE v_maxCredits        INT DEFAULT 18;
    DECLARE v_newCourseCredits  INT DEFAULT 0;
    DECLARE v_semester          INT DEFAULT 1;

    -- Get semester of this offering
    SELECT semester INTO v_semester
    FROM course_offerings WHERE id = NEW.courseOfferingId;

    -- Get credits for the new course
    SELECT c.credits INTO v_newCourseCredits
    FROM course_offerings co
    JOIN courses c ON co.courseId = c.id
    WHERE co.id = NEW.courseOfferingId;

    -- Get already enrolled credits this semester
    SELECT IFNULL(SUM(c.credits), 0) INTO v_enrolledCredits
    FROM student_courses sc
    JOIN course_offerings co ON sc.courseOfferingId = co.id
    JOIN courses c           ON co.courseId         = c.id
    WHERE sc.studentId = NEW.studentId
      AND co.semester  = v_semester
      AND sc.status IN ('pending','enrolled');

    -- Get department credit cap
    SELECT d.maxCreditsPerSemester INTO v_maxCredits
    FROM students s
    JOIN departments d ON s.departmentId = d.id
    WHERE s.id = NEW.studentId;

    IF (v_enrolledCredits + v_newCourseCredits) > v_maxCredits THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Credit limit exceeded: enrollment would surpass the maximum credits allowed per semester.';
    END IF;
END$$


-- TRIGGER 4: trg_set_enrollment_date
-- Automatically set enrollmentDate when status becomes
-- 'enrolled' for the first time.
CREATE TRIGGER trg_set_enrollment_date
BEFORE UPDATE ON student_courses
FOR EACH ROW
BEGIN
    IF NEW.status = 'enrolled' AND OLD.status = 'pending' AND OLD.enrollmentDate IS NULL THEN
        SET NEW.enrollmentDate = NOW();
    END IF;
END$$


DELIMITER ;

-- ============================================================
-- VIEWS
-- ============================================================

-- VIEW 1: vw_student_transcript
-- Full academic transcript for every student.
CREATE OR REPLACE VIEW vw_student_transcript AS
SELECT
    s.id                                        AS studentId,
    CONCAT(u.firstName, ' ', u.lastName)        AS studentName,
    s.rollNumber,
    d.name                                      AS department,
    b.name                                      AS batch,
    co.semester,
    c.code                                      AS courseCode,
    c.name                                      AS courseName,
    c.credits,
    sc.grade,
    sc.gradePoints,
    sc.status                                   AS enrollmentStatus,
    s.cgpa,
    s.earnedCredits,
    s.totalCredits
FROM student_courses sc
JOIN students         s   ON sc.studentId        = s.id
JOIN users            u   ON s.userId            = u.id
JOIN course_offerings co  ON sc.courseOfferingId = co.id
JOIN courses          c   ON co.courseId         = c.id
JOIN departments      d   ON s.departmentId      = d.id
JOIN batches          b   ON s.batchId           = b.id
ORDER BY s.rollNumber, co.semester, c.code;


-- VIEW 2: vw_attendance_summary
-- Per-student, per-offering attendance percentage.
CREATE OR REPLACE VIEW vw_attendance_summary AS
SELECT
    s.id                                     AS studentId,
    CONCAT(u.firstName, ' ', u.lastName)     AS studentName,
    s.rollNumber,
    co.id                                    AS offeringId,
    c.code                                   AS courseCode,
    c.name                                   AS courseName,
    co.semester,
    COUNT(a.id)                              AS totalLectures,
    SUM(a.status = 'present')                AS lecturesAttended,
    ROUND(
        (SUM(a.status = 'present') / COUNT(a.id)) * 100, 2
    )                                        AS attendancePercentage
FROM attendances     a
JOIN lectures        l   ON a.lectureId      = l.id
JOIN course_offerings co ON l.offeringId     = co.id
JOIN courses         c   ON co.courseId      = c.id
JOIN students        s   ON a.studentId      = s.id
JOIN users           u   ON s.userId         = u.id
GROUP BY s.id, co.id
ORDER BY s.rollNumber, co.semester;


-- VIEW 3: vw_course_offering_summary
-- Admin dashboard: each offering with teacher name,
-- enrolled student count, and result status.
CREATE OR REPLACE VIEW vw_course_offering_summary AS
SELECT
    co.id                                       AS offeringId,
    c.code                                      AS courseCode,
    c.name                                      AS courseName,
    c.credits,
    co.semester,
    d.name                                      AS department,
    b.name                                      AS batch,
    sec.name                                    AS section,
    CONCAT(tu.firstName, ' ', tu.lastName)      AS teacherName,
    t.employmentType,
    co.status                                   AS offeringStatus,
    co.resultStatus,
    COUNT(CASE WHEN sc.status = 'enrolled'  THEN 1 END) AS enrolledStudents,
    COUNT(CASE WHEN sc.status = 'completed' THEN 1 END) AS completedStudents,
    COUNT(CASE WHEN sc.status = 'failed'    THEN 1 END) AS failedStudents
FROM course_offerings co
JOIN courses     c    ON co.courseId     = c.id
JOIN departments d    ON co.departmentId = d.id
JOIN batches     b    ON co.batchId      = b.id
JOIN sections    sec  ON co.sectionId    = sec.id
LEFT JOIN teachers t  ON co.teacherId    = t.id
LEFT JOIN users   tu  ON t.userId        = tu.id
LEFT JOIN student_courses sc ON sc.courseOfferingId = co.id
GROUP BY co.id
ORDER BY co.semester, d.name, c.code;

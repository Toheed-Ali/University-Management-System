-- ============================================================
--  Course Management System (CMS) — seed.sql
--  Authors : Toheed Ali (BSCS24119), Taha Qureshi (BSCS24093)
--  Seeding records across all tables
-- ============================================================

USE universityPortalDB;
SET FOREIGN_KEY_CHECKS = 0;

-- INSTITUTION  (1 record)
INSERT INTO institution
  (name, shortName, city, province, country, email, address, registrationStartDate, registrationEndDate, createdAt, updatedAt)
VALUES
  ('Information Technology University', 'ITU', 'Lahore', 'Punjab', 'Pakistan', 'admin@itu.edu.pk', 'Ferozpur Road, Lahore', '2025-01-01 08:00:00', '2025-01-15 23:59:59', NOW(), NOW());

-- USERS  (59 records: 1 admin, 16 teachers, 43 students)
INSERT INTO users 
  (firstName, lastName, email, passwordHash, role, status, createdAt, updatedAt) 
VALUES
-- Admin
  ('University',  'Admin',    'admin@itu.edu.pk',              '$2a$10$rZiAjYuK/IHxPJou2A6vKOYytWmXNi0CB1p1edmO5KwHhn1J7U3UO', 'admin',   'active', NOW(), NOW());
-- DEPARTMENTS
INSERT INTO departments
  (institutionId, name, code, degreeTitle, totalCreditHours, maxCreditsPerSemester, headOfDepartment, status, createdAt, updatedAt)
VALUES
  (1, 'Computer Science',       'CS',  'Bachelor of Science in Computer Science',       136, 18, NULL, 'active', NOW(), NOW()),
  (1, 'Software Engineering',   'SE',  'Bachelor of Science in Software Engineering',   136, 18, NULL, 'active', NOW(), NOW()),
  (1, 'Artificial Intelligence','AI',  'Bachelor of Science in Artificial Intelligence',136, 18, NULL, 'active', NOW(), NOW());



-- BATCHES  (6 records, TWO per department)
INSERT INTO batches 
  (name, departmentId, year, status, createdAt, updatedAt) 
VALUES
  ('Fall 2024', 1, 2024, 'active', NOW(), NOW()),
  ('Fall 2025', 1, 2025, 'active', NOW(), NOW()),
  ('Fall 2024', 2, 2024, 'active', NOW(), NOW()),
  ('Fall 2025', 2, 2025, 'active', NOW(), NOW()),
  ('Fall 2024', 3, 2024, 'active', NOW(), NOW()),
  ('Fall 2025', 3, 2025, 'active', NOW(), NOW());

-- SECTIONS Table   (12 records)
INSERT INTO sections 
  (name, departmentId, batchId, status, createdAt, updatedAt) 
VALUES
  -- Department 1: Computer Science
  ('A', 1, 1, 'active', NOW(), NOW()),
  ('B', 1, 1, 'active', NOW(), NOW()),
  ('A', 1, 2, 'active', NOW(), NOW()),
  ('B', 1, 2, 'active', NOW(), NOW()),
  -- Department 2: Software Engineering
  ('A', 2, 3, 'active', NOW(), NOW()),
  ('B', 2, 3, 'active', NOW(), NOW()),
  ('A', 2, 4, 'active', NOW(), NOW()),
  ('B', 2, 4, 'active', NOW(), NOW()),
  -- Department 3: Artificial Intelligence
  ('A', 3, 5, 'active', NOW(), NOW()),
  ('B', 3, 5, 'active', NOW(), NOW()),
  ('A', 3, 6, 'active', NOW(), NOW()),
  ('B', 3, 6, 'active', NOW(), NOW());

-- COURSES
INSERT INTO courses (departmentId, code, name, credits, status, createdAt, updatedAt) VALUES

(1, 'CS-301', 'Programming Fundamentals',         3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(1, 'CS-302', 'Discrete Structures',              3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(1, 'CS-303', 'Object Oriented Programming',      3, 'active', NOW(), NOW()), -- 2nd semester courses for batch 2024
(1, 'CS-304', 'Multivariable Calculus',           3, 'active', NOW(), NOW()), -- 2nd semester courses for batch 2024

(2, 'SE-301', 'Software Requirements Engineering',3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(2, 'SE-302', 'Digital Logic and Design',         3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(2, 'SE-303', 'Software Quality Assurance',       3, 'active', NOW(), NOW()), -- 2nd semester courses for batch 2024
(2, 'SE-304', 'Agile Project Management',         3, 'active', NOW(), NOW()), -- 2nd semester courses for batch 2024

(3, 'AI-301', 'Machine Learning',                 3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(3, 'AI-302', 'Neural Networks & Deep Learning',  3, 'active', NOW(), NOW()), -- 1st semester courses for batch 2025
(3, 'AI-303', 'Natural Language Processing',      3, 'active', NOW(), NOW()), -- 2nd semester courses for batch 2024
(3, 'AI-304', 'Computer Vision',                  3, 'active', NOW(), NOW()); -- 2nd semester courses for batch 2024


-- COURSE_OFFERINGS
INSERT INTO course_offerings
  (courseId, teacherId, departmentId, batchId, sectionId, maxSeats, enrolledCount, semester, status, resultStatus, submittedAt, createdAt, updatedAt)
VALUES
-- Computer Science Department (departmentId = 1)
-- CS-301: Programming Fundamentals - Fall 2025 Batch (batchId=2) - Semester 1
(1,  NULL, 1, 2, 3, 45, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=3)
(1,  NULL, 1, 2, 4, 45, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=4)
-- CS-302: Discrete Structures - Fall 2025 Batch (batchId=2) - Semester 1
(2,  NULL, 1, 2, 3, 45, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=3)
(2,  NULL, 1, 2, 4, 45, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=4)
-- CS-303: Object Oriented Programming - Fall 2024 Batch (batchId=1) - Semester 2
(3,  NULL, 1, 1, 1, 45, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=1)
(3,  NULL, 1, 1, 2, 45, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=2)
-- CS-304: Multivariable Calculus - Fall 2024 Batch (batchId=1) - Semester 2
(4,  NULL, 1, 1, 1, 45, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=1)
(4,  NULL, 1, 1, 2, 45, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=2)

-- Software Engineering Department (departmentId = 2)
-- SE-301: Software Requirements Engineering - Fall 2025 Batch (batchId=4) - Semester 1
(5,  NULL,  2, 4, 7, 40, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=7)
(5,  NULL, 2, 4, 8, 40, 1, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=8)
-- SE-302: Digital Logic and Design - Fall 2025 Batch (batchId=4) - Semester 1
(6,  NULL, 2, 4, 7, 40, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=7)
(6,  NULL, 2, 4, 8, 40, 1, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=8)
-- SE-303: Software Quality Assurance - Fall 2024 Batch (batchId=3) - Semester 2
(7,  NULL, 2, 3, 5, 40, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=5)
(7,  NULL, 2, 3, 6, 40, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=6)
-- SE-304: Agile Project Management - Fall 2024 Batch (batchId=3) - Semester 2
(8,  NULL, 2, 3, 5, 40, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=5)
(8,  NULL, 2, 3, 6, 40, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=6)

-- Artificial Intelligence Department (departmentId = 3)
-- AI-301: Machine Learning - Fall 2025 Batch (batchId=6) - Semester 1
(9,  NULL, 3, 6, 11, 35, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=11)
(9,  NULL,  3, 6, 12, 35, 2, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=12)
-- AI-302: Neural Networks & Deep Learning - Fall 2025 Batch (batchId=6) - Semester 1
(10, NULL,  3, 6, 11, 35, 4, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=11)
(10, NULL,  3, 6, 12, 35, 2, 1, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=12)
-- AI-303: Natural Language Processing - Fall 2024 Batch (batchId=5) - Semester 2
(11, NULL,  3, 5, 9,  35, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=9)
(11, NULL,  3, 5, 10, 35, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section B (sectionId=10)
-- AI-304: Computer Vision - Fall 2024 Batch (batchId=5) - Semester 2
(12, NULL,  3, 5, 9,  35, 4, 2, 'active', 'pending', NULL, NOW(), NOW()),  -- Section A (sectionId=9)
(12, NULL,  3, 5, 10, 35, 4, 2, 'active', 'pending', NULL, NOW(), NOW());  -- Section B (sectionId=10)


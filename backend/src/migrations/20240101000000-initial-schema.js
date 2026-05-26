/**
 * Initial migration — baseline schema.
 *
 * This migration represents the schema that was previously managed by
 * sequelize.sync(). If your database already exists and has all tables,
 * mark this migration as already run without executing it:
 *
 *   INSERT INTO SequelizeMeta (name) VALUES ('20240101000000-initial-schema.js');
 *
 * For a fresh database, run:  npm run migrate
 */
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── institution ──────────────────────────────────────────────────────────
    await queryInterface.createTable('institution', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                  { type: Sequelize.STRING(255), allowNull: false },
      shortName:             { type: Sequelize.STRING(50) },
      city:                  { type: Sequelize.STRING(100) },
      province:              { type: Sequelize.STRING(100) },
      country:               { type: Sequelize.STRING(100) },
      registrationStartDate: { type: Sequelize.DATE },
      registrationEndDate:   { type: Sequelize.DATE },
      email:                 { type: Sequelize.STRING(255) },
      address:               { type: Sequelize.TEXT },
      createdAt:             { type: Sequelize.DATE, allowNull: false },
      updatedAt:             { type: Sequelize.DATE, allowNull: false }
    });

    // ── users ─────────────────────────────────────────────────────────────────
    await queryInterface.createTable('users', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      firstName:    { type: Sequelize.STRING(100), allowNull: false },
      lastName:     { type: Sequelize.STRING(100), allowNull: false },
      email:        { type: Sequelize.STRING(255), allowNull: false, unique: true },
      passwordHash: { type: Sequelize.STRING(255), allowNull: false },
      role:         { type: Sequelize.ENUM('admin', 'teacher', 'student'), allowNull: false },
      status:       { type: Sequelize.ENUM('active', 'inactive', 'suspended', 'graduated'), defaultValue: 'active' },
      lastLogin:    { type: Sequelize.DATE },
      tokenVersion: { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:    { type: Sequelize.DATE, allowNull: false },
      updatedAt:    { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('users', ['role']);
    await queryInterface.addIndex('users', ['status']);

    // ── departments ───────────────────────────────────────────────────────────
    await queryInterface.createTable('departments', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:                  { type: Sequelize.STRING(255), allowNull: false, unique: true },
      institutionId:         { type: Sequelize.INTEGER, references: { model: 'institution', key: 'id' } },
      code:                  { type: Sequelize.STRING(20), unique: true },
      degreeTitle:           { type: Sequelize.STRING(255) },
      totalCreditHours:      { type: Sequelize.INTEGER },
      maxCreditsPerSemester: { type: Sequelize.INTEGER, defaultValue: 18 },
      headOfDepartment:      { type: Sequelize.INTEGER, references: { model: 'users', key: 'id' } },
      status:                { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      createdAt:             { type: Sequelize.DATE, allowNull: false },
      updatedAt:             { type: Sequelize.DATE, allowNull: false }
    });

    // ── batches ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('batches', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:         { type: Sequelize.STRING(100), allowNull: false },
      departmentId: { type: Sequelize.INTEGER, references: { model: 'departments', key: 'id' } },
      year:         { type: Sequelize.INTEGER },
      status:       { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      createdAt:    { type: Sequelize.DATE, allowNull: false },
      updatedAt:    { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('batches', ['name', 'departmentId'], { unique: true });

    // ── sections ──────────────────────────────────────────────────────────────
    await queryInterface.createTable('sections', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name:         { type: Sequelize.STRING(50), allowNull: false },
      departmentId: { type: Sequelize.INTEGER, references: { model: 'departments', key: 'id' } },
      batchId:      { type: Sequelize.INTEGER, references: { model: 'batches', key: 'id' } },
      status:       { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      createdAt:    { type: Sequelize.DATE, allowNull: false },
      updatedAt:    { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('sections', ['name', 'batchId'], { unique: true });

    // ── students ──────────────────────────────────────────────────────────────
    await queryInterface.createTable('students', {
      id:                    { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId:                { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
      rollNumber:            { type: Sequelize.STRING(50), allowNull: false, unique: true },
      batchId:               { type: Sequelize.INTEGER, references: { model: 'batches', key: 'id' } },
      departmentId:          { type: Sequelize.INTEGER, references: { model: 'departments', key: 'id' } },
      sectionId:             { type: Sequelize.INTEGER, references: { model: 'sections', key: 'id' } },
      semester:              { type: Sequelize.INTEGER, defaultValue: 1 },
      cgpa:                  { type: Sequelize.DECIMAL(3, 2), defaultValue: 0.00 },
      totalCredits:          { type: Sequelize.INTEGER, defaultValue: 0 },
      earnedCredits:         { type: Sequelize.INTEGER, defaultValue: 0 },
      dateOfBirth:           { type: Sequelize.DATEONLY },
      gender:                { type: Sequelize.ENUM('male', 'female', 'other') },
      nationality:           { type: Sequelize.STRING(100) },
      religion:              { type: Sequelize.STRING(100) },
      fatherName:            { type: Sequelize.STRING(200) },
      cnic:                  { type: Sequelize.STRING(20) },
      phone:                 { type: Sequelize.STRING(20) },
      registrationStartDate: { type: Sequelize.DATE },
      registrationEndDate:   { type: Sequelize.DATE },
      createdAt:             { type: Sequelize.DATE, allowNull: false },
      updatedAt:             { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('students', ['departmentId']);
    await queryInterface.addIndex('students', ['semester']);

    // ── teachers ──────────────────────────────────────────────────────────────
    await queryInterface.createTable('teachers', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      userId:         { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' } },
      employeeId:     { type: Sequelize.STRING(50), unique: true },
      phone:          { type: Sequelize.STRING(20) },
      cnic:           { type: Sequelize.STRING(20), unique: true },
      dateOfBirth:    { type: Sequelize.DATEONLY },
      joiningDate:    { type: Sequelize.DATEONLY },
      gender:         { type: Sequelize.ENUM('male', 'female', 'other') },
      nationality:    { type: Sequelize.STRING(100) },
      religion:       { type: Sequelize.STRING(100) },
      employmentType: { type: Sequelize.ENUM('permanent', 'visiting'), defaultValue: 'permanent' },
      createdAt:      { type: Sequelize.DATE, allowNull: false },
      updatedAt:      { type: Sequelize.DATE, allowNull: false }
    });

    // ── courses ───────────────────────────────────────────────────────────────
    await queryInterface.createTable('courses', {
      id:           { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      departmentId: { type: Sequelize.INTEGER, references: { model: 'departments', key: 'id' } },
      code:         { type: Sequelize.STRING(20), allowNull: false },
      name:         { type: Sequelize.STRING(255), allowNull: false },
      credits:      { type: Sequelize.INTEGER, defaultValue: 3 },
      status:       { type: Sequelize.ENUM('active', 'inactive'), defaultValue: 'active' },
      createdAt:    { type: Sequelize.DATE, allowNull: false },
      updatedAt:    { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('courses', ['departmentId', 'code'], { unique: true });
    await queryInterface.addIndex('courses', ['departmentId', 'name'], { unique: true });

    // ── course_offerings ──────────────────────────────────────────────────────
    await queryInterface.createTable('course_offerings', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      courseId:       { type: Sequelize.INTEGER, references: { model: 'courses', key: 'id' } },
      teacherId:      { type: Sequelize.INTEGER, references: { model: 'teachers', key: 'id' } },
      departmentId:   { type: Sequelize.INTEGER, references: { model: 'departments', key: 'id' } },
      batchId:        { type: Sequelize.INTEGER, references: { model: 'batches', key: 'id' } },
      sectionId:      { type: Sequelize.INTEGER, references: { model: 'sections', key: 'id' } },
      semester:       { type: Sequelize.INTEGER },
      status:         { type: Sequelize.ENUM('active', 'inactive', 'completed'), defaultValue: 'active' },
      resultStatus:   { type: Sequelize.ENUM('pending', 'submitted', 'approved', 'rejected'), defaultValue: 'pending' },
      submittedAt:    { type: Sequelize.DATE },
      maxSeats:       { type: Sequelize.INTEGER, defaultValue: 50 },
      enrolledCount:  { type: Sequelize.INTEGER, defaultValue: 0 },
      createdAt:      { type: Sequelize.DATE, allowNull: false },
      updatedAt:      { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('course_offerings', ['courseId', 'batchId', 'sectionId', 'semester'], { unique: true });

    // ── student_courses ───────────────────────────────────────────────────────
    await queryInterface.createTable('student_courses', {
      id:               { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      studentId:        { type: Sequelize.INTEGER, references: { model: 'students', key: 'id' } },
      courseOfferingId: { type: Sequelize.INTEGER, references: { model: 'course_offerings', key: 'id' } },
      status:           { type: Sequelize.ENUM('pending', 'enrolled', 'rejected', 'dropped', 'completed', 'failed'), defaultValue: 'pending' },
      grade:            { type: Sequelize.STRING(5) },
      gradePoints:      { type: Sequelize.DECIMAL(3, 2) },
      enrollmentDate:   { type: Sequelize.DATE },
      createdAt:        { type: Sequelize.DATE, allowNull: false },
      updatedAt:        { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('student_courses', ['studentId', 'courseOfferingId'], { unique: true });

    // ── assignments ───────────────────────────────────────────────────────────
    await queryInterface.createTable('assignments', {
      id:                   { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      courseOfferingId:     { type: Sequelize.INTEGER, references: { model: 'course_offerings', key: 'id' } },
      assignmentNumber:     { type: Sequelize.INTEGER, allowNull: false },
      title:                { type: Sequelize.STRING(255), allowNull: false },
      description:          { type: Sequelize.TEXT },
      totalMarks:           { type: Sequelize.INTEGER, allowNull: false },
      dueDate:              { type: Sequelize.DATE, allowNull: false },
      createdBy:            { type: Sequelize.INTEGER, references: { model: 'teachers', key: 'id' } },
      plagiarismReportUrl:  { type: Sequelize.TEXT },
      plagiarismThreshold:  { type: Sequelize.INTEGER, defaultValue: 50 },
      plagiarismMatchCount: { type: Sequelize.INTEGER },
      createdAt:            { type: Sequelize.DATE, allowNull: false },
      updatedAt:            { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('assignments', ['courseOfferingId', 'assignmentNumber'], { unique: true });

    // ── assignment_submissions ────────────────────────────────────────────────
    await queryInterface.createTable('assignment_submissions', {
      id:             { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      assignmentId:   { type: Sequelize.INTEGER, references: { model: 'assignments', key: 'id' } },
      studentId:      { type: Sequelize.INTEGER, references: { model: 'students', key: 'id' } },
      submissionFile: { type: Sequelize.TEXT },
      submittedAt:    { type: Sequelize.DATE },
      marksAwarded:   { type: Sequelize.INTEGER },
      status:         { type: Sequelize.ENUM('draft', 'submitted', 'graded', 'late'), defaultValue: 'draft' },
      gradedBy:       { type: Sequelize.INTEGER, references: { model: 'teachers', key: 'id' } },
      gradedAt:       { type: Sequelize.DATE },
      createdAt:      { type: Sequelize.DATE, allowNull: false },
      updatedAt:      { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('assignment_submissions', ['assignmentId', 'studentId'], { unique: true });

    // ── lectures ──────────────────────────────────────────────────────────────
    await queryInterface.createTable('lectures', {
      id:            { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      offeringId:    { type: Sequelize.INTEGER, references: { model: 'course_offerings', key: 'id' } },
      lectureNumber: { type: Sequelize.INTEGER, allowNull: false },
      lectureDate:   { type: Sequelize.DATEONLY },
      topic:         { type: Sequelize.STRING(500) },
      createdBy:     { type: Sequelize.INTEGER, references: { model: 'teachers', key: 'id' } },
      createdAt:     { type: Sequelize.DATE, allowNull: false },
      updatedAt:     { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('lectures', ['offeringId', 'lectureNumber'], { unique: true });

    // ── attendances ───────────────────────────────────────────────────────────
    await queryInterface.createTable('attendances', {
      id:        { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      lectureId: { type: Sequelize.INTEGER, references: { model: 'lectures', key: 'id' }, onDelete: 'CASCADE' },
      studentId: { type: Sequelize.INTEGER, references: { model: 'students', key: 'id' } },
      status:    { type: Sequelize.ENUM('present', 'absent'), defaultValue: 'absent' },
      markedBy:  { type: Sequelize.INTEGER, references: { model: 'teachers', key: 'id' } },
      markedAt:  { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
    await queryInterface.addIndex('attendances', ['lectureId', 'studentId'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendances');
    await queryInterface.dropTable('lectures');
    await queryInterface.dropTable('assignment_submissions');
    await queryInterface.dropTable('assignments');
    await queryInterface.dropTable('student_courses');
    await queryInterface.dropTable('course_offerings');
    await queryInterface.dropTable('courses');
    await queryInterface.dropTable('teachers');
    await queryInterface.dropTable('students');
    await queryInterface.dropTable('sections');
    await queryInterface.dropTable('batches');
    await queryInterface.dropTable('departments');
    await queryInterface.dropTable('users');
    await queryInterface.dropTable('institution');
  }
};

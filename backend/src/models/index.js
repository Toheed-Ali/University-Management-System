const User = require('./User');
const Department = require('./Department');
const Student = require('./Student');
const Teacher = require('./Teacher');
const Course = require('./Course');
const CourseOffering = require('./CourseOffering');
const Batch = require('./Batch');
const Section = require('./Section');
const Institution = require('./Institution');
const Lecture = require('./Lecture');
const Attendance = require('./Attendance');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');

// Department -> Users (Head of Department)
Department.belongsTo(User, { foreignKey: 'headOfDepartment', as: 'head' });

// Department -> Institution
Department.belongsTo(Institution, { foreignKey: 'institutionId', as: 'institution' });
Institution.hasMany(Department, { foreignKey: 'institutionId', as: 'departments' });

// User -> Student (One-to-One)
User.hasOne(Student, { foreignKey: 'userId', as: 'studentProfile' });
Student.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Department -> Students
Department.hasMany(Student, { foreignKey: 'departmentId', as: 'students' });
Student.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasOne(Teacher, { foreignKey: 'userId', as: 'teacherProfile' });
Teacher.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Department -> Courses
Department.hasMany(Course, { foreignKey: 'departmentId', as: 'courses' });
Course.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Course Offering Relationships
CourseOffering.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Course.hasMany(CourseOffering, { foreignKey: 'courseId', as: 'offerings' });

CourseOffering.belongsTo(Teacher, { foreignKey: 'teacherId', as: 'teacher' });
Teacher.hasMany(CourseOffering, { foreignKey: 'teacherId', as: 'offerings' });

CourseOffering.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
Department.hasMany(CourseOffering, { foreignKey: 'departmentId', as: 'offerings' });

// Batch Relationships
Department.hasMany(Batch, { foreignKey: 'departmentId', as: 'batches' });
Batch.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Section Relationships
Department.hasMany(Section, { foreignKey: 'departmentId', as: 'sections' });
Section.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

Batch.hasMany(Section, { foreignKey: 'batchId', as: 'sections' });
Section.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });

// Student -> Batch/Section Relationships
Student.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Batch.hasMany(Student, { foreignKey: 'batchId', as: 'students' });

Student.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(Student, { foreignKey: 'sectionId', as: 'students' });

// CourseOffering -> Batch/Section Relationships
CourseOffering.belongsTo(Batch, { foreignKey: 'batchId', as: 'batch' });
Batch.hasMany(CourseOffering, { foreignKey: 'batchId', as: 'offerings' });

CourseOffering.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Section.hasMany(CourseOffering, { foreignKey: 'sectionId', as: 'offerings' });

// Student -> CourseOffering (Many-to-Many Enrollment)
const StudentCourse = require('./StudentCourse');
Student.belongsToMany(CourseOffering, { through: StudentCourse, foreignKey: 'studentId', as: 'enrolledCourses' });
CourseOffering.belongsToMany(Student, { through: StudentCourse, foreignKey: 'courseOfferingId', as: 'students' });
Student.hasMany(StudentCourse, { foreignKey: 'studentId' });
StudentCourse.belongsTo(Student, { foreignKey: 'studentId' });
CourseOffering.hasMany(StudentCourse, { foreignKey: 'courseOfferingId' });
StudentCourse.belongsTo(CourseOffering, { foreignKey: 'courseOfferingId' });


// Lecture Relationships
CourseOffering.hasMany(Lecture, { foreignKey: 'offeringId', as: 'lectures' });
Lecture.belongsTo(CourseOffering, { foreignKey: 'offeringId', as: 'offering' });

Teacher.hasMany(Lecture, { foreignKey: 'createdBy', as: 'createdLectures' });
Lecture.belongsTo(Teacher, { foreignKey: 'createdBy', as: 'creator' });

// Attendance Relationships
Lecture.hasMany(Attendance, { foreignKey: 'lectureId', as: 'attendances' });
Attendance.belongsTo(Lecture, { foreignKey: 'lectureId', as: 'lecture' });

Student.hasMany(Attendance, { foreignKey: 'studentId', as: 'attendances' });
Attendance.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Teacher.hasMany(Attendance, { foreignKey: 'markedBy', as: 'markedAttendances' });
Attendance.belongsTo(Teacher, { foreignKey: 'markedBy', as: 'marker' });

// Assignment Relationships
CourseOffering.hasMany(Assignment, { foreignKey: 'courseOfferingId', as: 'assignments' });
Assignment.belongsTo(CourseOffering, { foreignKey: 'courseOfferingId', as: 'offering' });

Teacher.hasMany(Assignment, { foreignKey: 'createdBy', as: 'createdAssignments' });
Assignment.belongsTo(Teacher, { foreignKey: 'createdBy', as: 'creator' });

// Assignment Submission Relationships
Assignment.hasMany(AssignmentSubmission, { foreignKey: 'assignmentId', as: 'submissions' });
AssignmentSubmission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

Student.hasMany(AssignmentSubmission, { foreignKey: 'studentId', as: 'submissions' });
AssignmentSubmission.belongsTo(Student, { foreignKey: 'studentId', as: 'student' });

Teacher.hasMany(AssignmentSubmission, { foreignKey: 'gradedBy', as: 'gradedSubmissions' });
AssignmentSubmission.belongsTo(Teacher, { foreignKey: 'gradedBy', as: 'grader' });

module.exports = {
    User,
    Department,
    Student,
    Teacher,
    Course,
    CourseOffering,
    Batch,
    Section,
    Institution,
    StudentCourse,
    Lecture,
    Attendance,
    Assignment,
    AssignmentSubmission
};

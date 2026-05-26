import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const StudentList = lazy(() => import('./pages/admin/students/StudentList'));
const StudentForm = lazy(() => import('./pages/admin/students/StudentForm'));
const StudentEdit = lazy(() => import('./pages/admin/students/StudentEdit'));
const StudentView = lazy(() => import('./pages/admin/students/StudentView'));
const TeacherList = lazy(() => import('./pages/admin/teachers/TeacherList'));
const TeacherForm = lazy(() => import('./pages/admin/teachers/TeacherForm'));
const TeacherEdit = lazy(() => import('./pages/admin/teachers/TeacherEdit'));
const TeacherView = lazy(() => import('./pages/admin/teachers/TeacherView'));
const DepartmentList = lazy(() => import('./pages/admin/departments/DepartmentList'));
const DepartmentForm = lazy(() => import('./pages/admin/departments/DepartmentForm'));
const DepartmentEdit = lazy(() => import('./pages/admin/departments/DepartmentEdit'));
const DepartmentView = lazy(() => import('./pages/admin/departments/DepartmentView'));
const CourseList = lazy(() => import('./pages/admin/courses/CourseList'));
const CourseForm = lazy(() => import('./pages/admin/courses/CourseForm'));
const CourseEdit = lazy(() => import('./pages/admin/courses/CourseEdit'));
const OfferingList = lazy(() => import('./pages/admin/offerings/OfferingList'));
const OfferingForm = lazy(() => import('./pages/admin/offerings/OfferingForm'));
const OfferingEdit = lazy(() => import('./pages/admin/offerings/OfferingEdit'));
const OfferingStudents = lazy(() => import('./pages/admin/offerings/OfferingStudents'));
const TeacherLayout = lazy(() => import('./components/teacher/TeacherLayout'));
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherCourses = lazy(() => import('./pages/teacher/Courses'));
const TeacherCourseStudents = lazy(() => import('./pages/teacher/CourseStudents'));
const TeacherAttendance = lazy(() => import('./pages/teacher/Attendance'));
const TeacherMarkAttendance = lazy(() => import('./pages/teacher/MarkAttendance'));
const TeacherResults = lazy(() => import('./pages/teacher/TeacherResults'));
const TeacherMarkResults = lazy(() => import('./pages/teacher/MarkResults'));
const TeacherAssignments = lazy(() => import('./pages/teacher/assignments/TeacherAssignments'));
const CourseAssignments = lazy(() => import('./pages/teacher/assignments/CourseAssignments'));
const AssignmentSubmissions = lazy(() => import('./pages/teacher/assignments/AssignmentSubmissions'));
const CreateAssignment = lazy(() => import('./pages/teacher/assignments/CreateAssignment'));
const EditAssignment = lazy(() => import('./pages/teacher/assignments/EditAssignment'));
const StudentLayout = lazy(() => import('./components/student/StudentLayout'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const StudentCourseRegistration = lazy(() => import('./pages/student/CourseRegistration'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const StudentTranscript = lazy(() => import('./pages/student/Transcript'));
const StudentAssignments = lazy(() => import('./pages/student/assignments/StudentAssignments'));
const StudentCourseView = lazy(() => import('./pages/student/assignments/StudentCourseView'));
const AssignmentDetail = lazy(() => import('./pages/student/assignments/AssignmentDetail'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Settings = lazy(() => import('./pages/admin/settings/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

function RouteLoader() {
    return (
        <div className="min-h-screen flex items-center justify-center text-gray-500">
            Loading...
        </div>
    );
}

function App() {
    return (
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <Suspense fallback={<RouteLoader />}>
                    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-200">
                        <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Navigate to="/login" replace />} />
                        <Route path="/login" element={<LoginPage />} />

                        {/* Admin Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route path="dashboard" element={<AdminDashboard />} />

                                <Route path="students" element={<StudentList />} />
                                <Route path="students/new" element={<StudentForm />} />
                                <Route path="students/:id" element={<StudentView />} />
                                <Route path="students/:id/edit" element={<StudentEdit />} />

                                <Route path="teachers" element={<TeacherList />} />
                                <Route path="teachers/new" element={<TeacherForm />} />
                                <Route path="teachers/:id" element={<TeacherView />} />
                                <Route path="teachers/:id/edit" element={<TeacherEdit />} />

                                <Route path="departments" element={<DepartmentList />} />
                                <Route path="departments/new" element={<DepartmentForm />} />
                                <Route path="departments/:id" element={<DepartmentView />} />
                                <Route path="departments/:id/edit" element={<DepartmentEdit />} />

                                <Route path="courses" element={<CourseList />} />
                                <Route path="courses/new" element={<CourseForm />} />
                                <Route path="courses/:id/edit" element={<CourseEdit />} />

                                <Route path="offerings" element={<OfferingList />} />
                                <Route path="offerings/new" element={<OfferingForm />} />
                                <Route path="offerings/students" element={<OfferingStudents />} />
                                <Route path="offerings/:id/edit" element={<OfferingEdit />} />

                                <Route path="settings" element={<Settings />} />
                            </Route>
                        </Route>

                        {/* Teacher Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
                            <Route path="/teacher" element={<TeacherLayout />}>
                                <Route path="dashboard" element={<TeacherDashboard />} />
                                <Route path="courses" element={<TeacherCourses />} />
                                <Route path="courses/:offeringId/students" element={<TeacherCourseStudents />} />
                                <Route path="attendance" element={<TeacherAttendance />} />
                                <Route path="lectures/:lectureId/mark" element={<TeacherMarkAttendance />} />
                                <Route path="results" element={<TeacherResults />} />
                                <Route path="results/:offeringId" element={<TeacherMarkResults />} />
                                <Route path="assignments" element={<TeacherAssignments />} />
                                <Route path="assignments/:offeringId" element={<CourseAssignments />} />
                                <Route path="assignments/:offeringId/create" element={<CreateAssignment />} />
                                <Route path="assignments/:offeringId/edit/:assignmentId" element={<EditAssignment />} />
                                <Route path="assignments/:offeringId/submissions/:assignmentId" element={<AssignmentSubmissions />} />
                            </Route>
                        </Route>

                        {/* Student Routes */}
                        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
                            <Route path="/student" element={<StudentLayout />}>
                                <Route path="dashboard" element={<StudentDashboard />} />
                                <Route path="registration" element={<StudentCourseRegistration />} />
                                <Route path="attendance" element={<StudentAttendance />} />
                                <Route path="transcript" element={<StudentTranscript />} />
                                <Route path="assignments" element={<StudentAssignments />} />
                                <Route path="assignments/:offeringId" element={<StudentCourseView />} />
                                <Route path="assignments/:offeringId/detail/:assignmentId" element={<AssignmentDetail />} />
                            </Route>
                        </Route>

                        {/* Catch all */}
                        <Route path="*" element={<NotFound />} />
                        </Routes>
                    </div>
                </Suspense>
            </AuthProvider>
        </Router>
    )
}

export default App;
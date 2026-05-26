import { useEffect, useState } from 'react';
import axios from 'axios';
import './StudentDashboard.css';

const Dashboard = () => {
    const [profile, setProfile] = useState(null);
    const [courses, setCourses] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [stats, setStats] = useState({ cgpa: '0.00', earnedCredits: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        console.log('Initializing Dashboard...');
        const profileData = await loadStudentProfile();
        console.log('Profile data loaded:', profileData);
        const currentSemester = profileData ? (profileData.semester || 1) : 1;
        await Promise.all([
            loadEnrolledCourses(currentSemester),
            loadAttendanceSummary(currentSemester),
            loadAcademicStats()
        ]);
        console.log('Dashboard initialization complete.');
    };

    const loadStudentProfile = async () => {
        try {
            console.log('Fetching student profile from: /api/students/me');
            const res = await axios.get('/api/v1/students/me');
            console.log('Profile response:', res.data);
            const profileData = res.data.data;
            setProfile(profileData);
            setLoading(false);
            return profileData;
        } catch (error) {
            console.error('Failed to load profile:', error);
            setLoading(false);
            return null;
        }
    };

    const loadEnrolledCourses = async (currentSemester) => {
        try {
            console.log('Fetching enrolled courses from: /api/students/me/courses');
            const res = await axios.get('/api/v1/students/me/courses');
            console.log('Courses response:', res.data);
            const allCourses = res.data.data || [];
            // Only show officially enrolled (approved) courses
            const enrolledCourses = allCourses.filter(c => c.status === 'enrolled');
            console.log('Filtered enrolled courses:', enrolledCourses);
            setCourses(enrolledCourses);
        } catch (error) {
            console.error('Failed to load courses:', error);
            setCourses([]);
        }
    };

    const loadAttendanceSummary = async (currentSemester) => {
        try {
            console.log('Fetching attendance summary for CURRENT only from: /api/attendance/student/my-attendance?currentOnly=true');
            const res = await axios.get('/api/v1/attendance/student/my-attendance?currentOnly=true');
            console.log('Attendance response:', res.data);
            const attendanceData = res.data.data || [];
            console.log('Attendance data:', attendanceData);
            setAttendance(attendanceData);
        } catch (error) {
            console.error('Failed to load attendance:', error);
            setAttendance([]);
        }
    };

    const loadAcademicStats = async () => {
        try {
            const res = await axios.get('/api/v1/students/me/transcript');
            if (res.data.success) {
                const data = res.data.data;
                const earned = data.semesters.reduce((acc, sem) => acc + sem.totalCredits, 0);
                setStats({
                    cgpa: data.cgpa || '0.00',
                    earnedCredits: earned
                });
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    // Calculate circular progress for credits
    const calculateCreditsProgress = () => {
        if (!profile) return { earned: 0, total: 135, percent: 0, offset: 106.81 };
        const earned = stats.earnedCredits || 0;
        const total = profile.department?.totalCreditHours || 135;
        const percent = total > 0 ? Math.round((earned / total) * 100) : 0;
        const circumference = 2 * Math.PI * 13.6;
        const offset = circumference - (percent / 100) * circumference;
        return { earned, total, percent, offset, circumference };
    };

    const creditsProgress = calculateCreditsProgress();

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    const fullName = profile ? `${profile.user?.firstName} ${profile.user?.lastName}` : 'Student';
    const firstName = profile?.user?.firstName || 'Student';
    const rollNumber = profile?.rollNumber || 'N/A';
    const department = profile?.department?.name || 'N/A';
    const semester = profile?.semester || 1;
    const batch = profile?.batch?.name || 'N/A';
    const section = profile?.section?.name || 'N/A';
    const cgpa = profile?.cgpa || '0.00';
    const initials = profile ? `${profile.user?.firstName?.[0] || ''}${profile.user?.lastName?.[0] || ''}`.toUpperCase() : '--';

    return (
        <div className="dashboard-container">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome back, <span>{firstName}</span>!</h1>
                    <p className="page-subtitle">Here's your academic progress overview</p>
                </div>
            </div>

            {/* Stats Grid */}
            <section className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" viewBox="0 0 512 331.17" className="uni-logo-svg" style={{ width: '24px', height: '24px' }}>
                            <path fill="currentColor" fillRule="nonzero" d="M34.88 0h442.24c9.56 0 18.28 3.93 24.59 10.24C508.07 16.55 512 25.29 512 34.88V296.3c0 9.57-3.94 18.31-10.25 24.62l-.68.62c-6.26 5.95-14.71 9.63-23.95 9.63H34.88c-9.55 0-18.28-3.93-24.61-10.26C3.93 314.62 0 305.9 0 296.3V34.88c0-9.56 3.93-18.27 10.24-24.6l.04-.04C16.63 3.92 25.33 0 34.88 0zm232.89 113.65c-4.68 0-8.48-5.06-8.48-11.3 0-6.25 3.8-11.31 8.48-11.31h120.41c4.68 0 8.48 5.06 8.48 11.31 0 6.24-3.8 11.3-8.48 11.3H267.77zm0 121.96c-4.68 0-8.48-5.06-8.48-11.3 0-6.24 3.8-11.31 8.48-11.31h179.5c4.68 0 8.48 5.07 8.48 11.31s-3.8 11.3-8.48 11.3h-179.5zm0-60.98c-4.68 0-8.48-5.06-8.48-11.3 0-6.24 3.8-11.3 8.48-11.3h167.88c4.68 0 8.48 5.06 8.48 11.3 0 6.24-3.8 11.3-8.48 11.3H267.77zm-93.21 19.9c9.47 8.16 27.48 5.71 37.6 11.36 3.22 1.8 6.14 4.09 8.48 7.18 5.8 7.66 6.25 10.46 8.46 19.81-.52 5.51-3.65 8.69-9.8 9.16H78.13c-6.15-.47-9.28-3.65-9.8-9.16 2.21-9.35 2.66-12.15 8.47-19.81 2.34-3.1 5.25-5.38 8.47-7.18 9.96-5.55 27.26-3.14 37.13-10.97 1.49-3.23 3-7.81 3.95-10.7l.4-1.19c1.1-3.29-5.4-9.72-7.58-13.18l-8.08-12.84c-2.95-4.41-4.49-8.44-4.58-11.74-.05-1.56.22-2.97.79-4.2.6-1.3 1.53-2.39 2.78-3.23.58-.39 1.24-.72 1.96-1-.53-6.96-.72-12.26-.38-19.61.17-1.74.5-3.49.99-5.23 2.96-10.57 12.04-18.18 22.42-21.76 5.03-1.74 3.09-5.89 8.17-5.61 12.06.66 30.67 8.43 37.81 16.67 10.02 11.55 7.43 22.28 7.1 36.38v-.01c2.24.68 3.67 2.1 4.26 4.41.65 2.54-.05 6.14-2.21 11.03h-.01c-.04.09-.08.18-.14.26l-9.2 15.16c-3.55 5.85-7.15 11.71-11.96 16.21-.23.22-.47.43-.71.64.7.97 1.51 2.16 2.38 3.44 1.25 1.84 2.63 3.86 4 5.71zM477.12 20.34H34.88c-4.01 0-7.65 1.63-10.26 4.24l-.04.04a14.488 14.488 0 0 0-4.24 10.26V296.3c0 3.97 1.65 7.61 4.29 10.25a14.31 14.31 0 0 0 10.25 4.28h442.24c3.78 0 7.25-1.47 9.85-3.87l.4-.42c2.64-2.64 4.29-6.28 4.29-10.24V34.88c0-3.98-1.65-7.62-4.29-10.26a14.392 14.392 0 0 0-10.25-4.28z" />
                        </svg>
                    </div>
                    <div className="stat-content-flex">
                        <p className="stat-label">{batch} - Section {section}</p>
                        <h3 className="stat-value">{rollNumber}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon">
                        <span className="material-symbols-outlined">grade</span>
                    </div>
                    <div>
                        <p className="stat-label">Current SGPA</p>
                        <h3 className="stat-value">{stats.cgpa}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon">
                        <span className="material-symbols-outlined">analytics</span>
                    </div>
                    <div>
                        <p className="stat-label">Current CGPA</p>
                        <h3 className="stat-value">{stats.cgpa}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="circular-progress" data-progress={creditsProgress.percent}>
                        <svg className="progress-ring" width="32" height="32">
                            <circle
                                className="progress-ring-circle-bg"
                                stroke="#E2E8F0"
                                strokeWidth="2.4"
                                fill="transparent"
                                r="13.6"
                                cx="16"
                                cy="16"
                            />
                            <circle
                                className="progress-ring-circle"
                                stroke="var(--primary)"
                                strokeWidth="2.4"
                                fill="transparent"
                                r="13.6"
                                cx="16"
                                cy="16"
                                strokeDasharray={`${creditsProgress.circumference} ${creditsProgress.circumference}`}
                                strokeDashoffset={creditsProgress.offset}
                            />
                        </svg>
                        <div className="progress-percentage">{creditsProgress.percent}%</div>
                    </div>
                    <div className="stat-content-flex">
                        <p className="stat-label">Credits Earned</p>
                        <h3 className="stat-value">{creditsProgress.earned} / {creditsProgress.total}</h3>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className="main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '1.5rem' }}>
                {/* Enrolled Courses */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">book</span>
                            Enrolled Courses
                        </h2>
                        <span className="section-badge">Semester {semester}</span>
                    </div>

                    <div className="courses-list">
                        {courses.length === 0 ? (
                            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-400)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.02)', border: '2px dashed rgba(0,0,0,0.05)' }}>
                                <div style={{ width: '51.2px', height: '51.2px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>history_edu</span>
                                </div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--slate-700)', marginBottom: '0.5rem' }}>No any enrolled courses</h3>
                                <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', maxWidth: '200px', lineHeight: 1.5 }}>You haven't enrolled in any courses for this semester yet.</p>
                            </div>
                        ) : (
                            courses.map((course, index) => (
                                <div key={index} className="card course-card">
                                    <div className="course-left">
                                        <div className="course-icon">
                                            <span className="material-symbols-outlined">book</span>
                                        </div>
                                        <div>
                                            <h4 className="course-title">{course.courseName}</h4>
                                            <p className="course-instructor">{course.teacherName}</p>
                                        </div>
                                    </div>
                                    <div className="course-right">
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--slate-500)' }}>{course.courseCode}</p>
                                            <p style={{ fontWeight: 600, color: 'var(--slate-700)' }}>{course.credits} Credits</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Attendance Summary */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">how_to_reg</span>
                            Attendance
                        </h2>
                    </div>

                    <div>
                        {attendance.length === 0 ? (
                            <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--slate-400)', marginBottom: '0.5rem' }}>event_busy</span>
                                <p style={{ fontSize: '0.875rem' }}>No attendance data yet</p>
                            </div>
                        ) : (
                            <div className="card" style={{ padding: '1rem' }}>
                                {attendance.map((course, index) => {
                                    const percentage = course.attendancePercentage || 0;
                                    const progressClass = percentage >= 75 ? 'excellent' : 'danger';

                                    return (
                                        <div key={index} style={{ padding: '0.75rem 0', borderBottom: index < attendance.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                                    {course.courseName}
                                                </p>
                                                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--primary)' }}>{percentage}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '0.5rem', background: 'var(--slate-200)', borderRadius: '7999.2px', overflow: 'hidden' }}>
                                                <div className={`progress-bar-${progressClass}`} style={{ height: '100%', width: `${percentage}%`, transition: 'width 0.5s ease' }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

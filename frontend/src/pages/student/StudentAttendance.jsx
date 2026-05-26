import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './StudentAttendance.css';

const StudentAttendance = () => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedCourses, setExpandedCourses] = useState({});

    const loadAttendanceData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/v1/attendance/student/my-attendance');
            setAttendanceData(res.data.data || []);
        } catch (err) {
            console.error('Failed to load attendance:', err);
            setError('Failed to fetch attendance data. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAttendanceData();
    }, [loadAttendanceData]);

    const toggleLectureDetails = (courseId) => {
        setExpandedCourses(prev => ({
            ...prev,
            [courseId]: !prev[courseId]
        }));
    };

    if (loading) {
        return (
            <div>
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">My Attendance</h1>
                        <p className="page-subtitle">Track your attendance across all enrolled courses</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                    <p>Loading attendance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">My Attendance</h1>
                        <p className="page-subtitle">Track your attendance across all enrolled courses</p>
                    </div>
                </div>
                <div className="empty-state">
                    <span className="material-symbols-outlined" style={{ color: 'var(--red-500)' }}>error</span>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--red-500)' }}>Error Loading Attendance</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">My Attendance</h1>
                    <p className="page-subtitle">Track your attendance across all enrolled courses</p>
                </div>
            </div>

            <div id="attendanceContainer">
                {attendanceData.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">event_busy</span>
                        <h3 style={{ margin: '1rem 0 0.5rem' }}>No Attendance Records</h3>
                        <p>You don't have any attendance data yet. Your teachers will mark attendance for lectures.</p>
                    </div>
                ) : (
                    (() => {
                        // Group by semester
                        const groupedData = attendanceData.reduce((acc, course) => {
                            const sem = course.semester || 'Other';
                            if (!acc[sem]) acc[sem] = [];
                            acc[sem].push(course);
                            return acc;
                        }, {});

                        // Get unique semesters sorted descending
                        const semesters = Object.keys(groupedData).sort((a, b) => {
                            if (a === 'Other') return 1;
                            if (b === 'Other') return -1;
                            return parseInt(b) - parseInt(a);
                        });

                        return semesters.map(semester => (
                            <div key={semester} className="semester-group" style={{ marginBottom: '2.5rem' }}>
                                <div className="semester-divider" style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    marginBottom: '1.5rem',
                                    padding: '0 0.5rem'
                                }}>
                                    <h2 style={{
                                        fontSize: '1.125rem',
                                        fontWeight: 700,
                                        color: 'var(--slate-600)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        margin: 0,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {semester === 'Other' ? 'Other Courses' : `Semester ${semester}`}
                                        {groupedData[semester].some(c => c.enrollmentStatus === 'enrolled') && (
                                            <span style={{
                                                marginLeft: '0.75rem',
                                                padding: '0.25rem 0.75rem',
                                                background: 'var(--primary-light)',
                                                color: 'var(--primary)',
                                                borderRadius: '1rem',
                                                fontSize: '0.75rem',
                                                verticalAlign: 'middle'
                                            }}>CURRENT</span>
                                        )}
                                    </h2>
                                    <div style={{ flex: 1, height: '2px', background: 'var(--slate-200)', borderRadius: '1px' }}></div>
                                </div>

                                {groupedData[semester].map(course => {
                                    const percentage = course.attendancePercentage || 0;
                                    const progressClass = percentage >= 75 ? 'excellent' : 'danger';
                                    const isExpanded = !!expandedCourses[course.offeringId];

                                    return (
                                        <div key={course.offeringId} className="attendance-course-card" style={{ marginBottom: '1rem' }}>
                                            <div className="attendance-header" onClick={() => toggleLectureDetails(course.offeringId)}>
                                                <div style={{ flex: 1 }}>
                                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                                                        {course.courseCode} - {course.courseName}
                                                    </h3>
                                                    <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                                                        {course.sectionName ? 'Section ' + course.sectionName : ''} | {course.semesterName || 'Semester'}
                                                    </p>
                                                </div>
                                                <div style={{ textAlign: 'center', margin: '0 2rem' }}>
                                                    <div className="attendance-percentage">{percentage}%</div>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', fontWeight: 600, textAlign: 'center', margin: 0 }}>ATTENDANCE</p>
                                                </div>
                                                <span className={`material-symbols-outlined toggle-icon ${isExpanded ? 'rotated' : ''}`} style={{ color: 'var(--primary)' }}>
                                                    expand_more
                                                </span>
                                            </div>

                                            <div className="attendance-stats">
                                                <div className="stat-item">
                                                    <div className="stat-item-label">Total Lectures</div>
                                                    <div className="stat-item-value">{course.totalLectures}</div>
                                                </div>
                                                <div className="stat-item">
                                                    <div className="stat-item-label">Present</div>
                                                    <div className="stat-item-value" style={{ color: '#22C55E' }}>{course.presentCount}</div>
                                                </div>
                                                <div className="stat-item">
                                                    <div className="stat-item-label">Absent</div>
                                                    <div className="stat-item-value" style={{ color: '#EF4444' }}>{course.absentCount}</div>
                                                </div>
                                            </div>

                                            <div className="progress-container">
                                                <div className="progress-label">
                                                    <span>Attendance Progress</span>
                                                    <span style={{ fontWeight: 700 }}>{percentage}%</span>
                                                </div>
                                                <div className="progress-bar-container">
                                                    <div className={`progress-bar ${progressClass}`} style={{ width: `${percentage}%` }}></div>
                                                </div>
                                            </div>

                                            <div className={`lecture-details ${isExpanded ? 'show' : ''}`}>
                                                <div className="lecture-details-content">
                                                    <h4 style={{ fontWeight: 700, marginBottom: '1rem', color: 'var(--slate-800)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>event_note</span>
                                                        Lecture-wise Attendance
                                                    </h4>
                                                    {course.lectures && course.lectures.length > 0 ? (
                                                        course.lectures.map((lecture, idx) => (
                                                            <div key={idx} className="lecture-row">
                                                                <div style={{ fontWeight: 700, color: 'var(--slate-800)' }}>Lecture {lecture.lectureNumber}</div>
                                                                <div style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                                                                    {lecture.topic || 'No topic'}
                                                                </div>
                                                                <div style={{ fontSize: '0.875rem', color: 'var(--slate-500)' }}>
                                                                    {new Date(lecture.lectureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <span className={`attendance-badge ${lecture.status === 'present' ? 'present' : lecture.status === 'absent' ? 'absent' : 'not-marked'}`}>
                                                                        {lecture.status === 'present' ? 'Present' : lecture.status === 'absent' ? 'Absent' : 'Not Marked'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '1rem' }}>No lectures recorded yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ));
                    })()
                )}
            </div>
        </div>
    );
};

export default StudentAttendance;

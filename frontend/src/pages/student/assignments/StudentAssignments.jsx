import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentAssignments.css';

const StudentAssignments = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadCourses = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/v1/student/my-courses-assignments');
            setCourses(res.data.data || []);
        } catch (err) {
            console.error('Failed to load courses:', err);
            setError('Failed to fetch assignment data. Please refresh the page.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

    if (loading) {
        return (
            <div>
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">My Assignments</h1>
                        <p className="page-subtitle">View and submit assignments for your enrolled courses</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                    <p>Loading your courses...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <div>
                        <h1 className="page-title">My Assignments</h1>
                        <p className="page-subtitle">View and submit assignments for your enrolled courses</p>
                    </div>
                </div>
                <div className="empty-state">
                    <span className="material-symbols-outlined" style={{ color: 'var(--red-500)' }}>error</span>
                    <h3 style={{ marginBottom: '0.5rem', color: 'var(--red-500)' }}>Error Loading Data</h3>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">My Assignments</h1>
                    <p className="page-subtitle">View and submit assignments for your enrolled courses</p>
                </div>
            </div>

            <div>
                {courses.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">school</span>
                        <h3 style={{ margin: '1rem 0 0.5rem' }}>No Enrolled Courses</h3>
                        <p>You are not enrolled in any courses yet.</p>
                    </div>
                ) : (
                    <div className="assignment-courses-grid">
                        {courses.map(course => (
                            <div
                                key={course.offeringId}
                                className="assignment-course-card"
                                onClick={() => navigate(`/student/assignments/${course.offeringId}`, {
                                    state: { courseName: course.courseName, courseCode: course.courseCode }
                                })}
                            >
                                <div className="assignment-course-header">
                                    <div style={{ flex: 1 }}>
                                        <h3>{course.courseName}</h3>
                                        <p>{course.teacherName || 'Instructor TBA'}</p>
                                    </div>
                                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>chevron_right</span>
                                </div>
                                <div className="assignment-due-list">
                                    {course.dueAssignments && course.dueAssignments.length > 0 ? (
                                        course.dueAssignments.map(a => {
                                            const due = new Date(a.dueDate);
                                            const now = new Date();
                                            const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
                                            let dueLabel;
                                            if (diffDays === 0) dueLabel = 'Due Today';
                                            else if (diffDays === 1) dueLabel = 'Due Tomorrow';
                                            else if (diffDays <= 7) dueLabel = `Due ${due.toLocaleDateString('en-US', { weekday: 'long' })}`;
                                            else dueLabel = `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

                                            return (
                                                <div key={a.id} className="assignment-due-item">
                                                    <div className="assignment-due-label">{dueLabel}</div>
                                                    <div className="assignment-due-title">
                                                        {due.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – {a.title}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="assignment-due-empty">No upcoming assignments</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentAssignments;

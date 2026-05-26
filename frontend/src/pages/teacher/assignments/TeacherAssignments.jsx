import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const TeacherAssignments = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            const res = await axios.get('/api/v1/teachers/offerings');
            setCourses(res.data.data || []);
        } catch (error) {
            console.error('Failed to load courses:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading-placeholder">Loading courses...</div>;

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Assignments</h1>
                    <p className="page-subtitle">Create and manage assignments for your courses</p>
                </div>
            </div>

            <section>
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="material-symbols-outlined">book</span>
                        Select a Course
                    </h2>
                </div>

                {courses.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined">menu_book</span>
                        <p>No courses assigned to you yet.</p>
                    </div>
                ) : (
                    <div className="courses-list">
                        {courses.map(course => (
                            <div
                                key={course.id}
                                className="card course-card lecture-card"
                                onClick={() => navigate(`/teacher/assignments/${course.id}`, {
                                    state: { courseName: course.courseName, courseCode: course.courseCode, sectionName: course.sectionName }
                                })}
                                style={{ cursor: 'pointer' }}
                            >
                                <div>
                                    <h4 className="course-title">{course.courseCode} - {course.courseName}</h4>
                                    <p className="course-instructor">Section {course.sectionName || 'A'} | {course.semesterName || `Semester ${course.semester}`}</p>
                                </div>
                                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>chevron_right</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <style>{`
                .courses-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    margin-top: 1rem;
                }
                .course-card {
                    padding: 1.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.2s ease;
                    border: 1px solid var(--border-color);
                }
                .course-card:hover {
                    border-color: var(--primary) !important;
                    transform: translateY(-2px);
                    background: var(--bg-card);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
                }
                .course-title {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: var(--text-primary) !important;
                    margin: 0 0 0.25rem 0;
                }
                .course-instructor {
                    font-size: 0.9rem;
                    color: var(--text-secondary) !important;
                    margin: 0;
                }
                .page-title {
                    color: var(--text-primary) !important;
                }
                .page-subtitle {
                    color: var(--text-secondary) !important;
                }
                .section-title {
                    color: var(--text-primary) !important;
                }
            `}</style>
        </div>
    );
};

export default TeacherAssignments;

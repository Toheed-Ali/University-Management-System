import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Courses.css';
import '../admin/AdminDashboard.css'; // Ensure base styles are available

const Courses = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/teachers/offerings');
            setOfferings(res.data.data || []);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load courses:', err);
            setError('Error loading courses. Please try again.');
            setLoading(false);
        }
    };

    const handleViewStudents = (offeringId) => {
        navigate(`/teacher/courses/${offeringId}/students`);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        My Courses
                    </h1>
                    <p className="page-subtitle">All courses assigned to you. Click a course to view enrolled students.</p>
                </div>
            </div>

            <div className="teacher-courses-grid-view">
                {loading ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                        Loading courses...
                    </div>
                ) : error ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--red-500)' }}>
                        {error}
                    </div>
                ) : offerings.length === 0 ? (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>menu_book</span>
                        No courses assigned to you yet.
                    </div>
                ) : (
                    offerings.map(offering => (
                        <div key={offering.id} className="teacher-course-box-card">
                            <div className="box-header">
                                <div className="box-icon">
                                    <span className="material-symbols-outlined">menu_book</span>
                                </div>
                                <div className="box-info">
                                    <h3>{offering.courseName}</h3>
                                    <span className="course-code">{offering.courseCode}</span>
                                </div>
                            </div>

                            <div className="box-meta">
                                <div className="meta-item">
                                    <span className="material-symbols-outlined">groups</span>
                                    <span>Section <strong>{offering.sectionName || 'A'}</strong></span>
                                </div>
                                <div className="meta-item">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                    <span>{offering.semesterName || 'Fall 2024'}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="material-symbols-outlined">person</span>
                                    <span><strong>{offering.enrolledCount || 0}</strong> Students Enrolled</span>
                                </div>
                            </div>

                            <button className="view-details-btn" onClick={() => handleViewStudents(offering.id)}>
                                <span className="material-symbols-outlined">group</span>
                                View Details
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Courses;

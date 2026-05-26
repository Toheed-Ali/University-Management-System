import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Courses.css'; // Reuse existing styles
import '../admin/AdminDashboard.css';

const TeacherResults = () => {
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

    const handleMarkResults = (offeringId) => {
        navigate(`/teacher/results/${offeringId}`);
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: { bg: '#F1F5F9', color: '#64748B', label: 'Pending' },
            submitted: { bg: '#DBEAFE', color: '#2563EB', label: 'Submitted' },
            approved: { bg: '#DCFCE7', color: '#16A34A', label: 'Approved' },
            rejected: { bg: '#FEE2E2', color: '#DC2626', label: 'Rejected (Resubmit)' }
        };
        const s = styles[status] || styles.pending;

        return (
            <span style={{
                background: s.bg,
                color: s.color,
                padding: '0.25rem 0.75rem',
                borderRadius: '7999.2px',
                fontSize: '0.75rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem'
            }}>
                {status === 'rejected' && <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>warning</span>}
                {s.label}
            </span>
        );
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Student Results
                    </h1>
                    <p className="page-subtitle">Select a course to mark grades and submit results.</p>
                </div>
            </div>

            <div className="courses-grid">
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
                        <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}>assignment_turned_in</span>
                        No courses assigned to you.
                    </div>
                ) : (
                    offerings.map(offering => (
                        <div key={offering.id} className="course-card course-row-card">
                            <div className="course-header">
                                <div className="course-icon" style={{ background: offering.resultStatus === 'rejected' ? '#FEE2E2' : undefined }}>
                                    <span className="material-symbols-outlined" style={{ color: offering.resultStatus === 'rejected' ? '#DC2626' : undefined }}>
                                        {offering.resultStatus === 'approved' ? 'check_circle' : 'analytics'}
                                    </span>
                                </div>
                                <div className="course-info">
                                    <h3>{offering.courseName}</h3>
                                    <span className="course-code">{offering.courseCode}</span>
                                </div>
                            </div>
                            <div className="course-meta">
                                <div className="meta-item">
                                    <span className="material-symbols-outlined">groups</span>
                                    Section {offering.sectionName || 'A'}
                                </div>
                                <div className="meta-item">
                                    <span className="material-symbols-outlined">calendar_month</span>
                                    {offering.semesterName}
                                </div>
                                <div className="meta-item">
                                    {getStatusBadge(offering.resultStatus || 'pending')}
                                </div>
                            </div>
                            <button className="view-students-btn" onClick={() => handleMarkResults(offering.id)}>
                                <span className="material-symbols-outlined">edit_note</span>
                                {offering.resultStatus === 'submitted' || offering.resultStatus === 'approved' ? 'View Result' : 'Mark Grades'}
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TeacherResults;

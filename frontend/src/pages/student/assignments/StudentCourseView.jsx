import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './StudentAssignments.css';

const StudentCourseView = () => {
    const { offeringId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const courseName = location.state?.courseName || '';
    const courseCode = location.state?.courseCode || '';

    const [assignments, setAssignments] = useState([]);
    const [courseInfo, setCourseInfo] = useState({});
    const [loading, setLoading] = useState(true);

    const loadAssignments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/v1/student/offerings/${offeringId}/assignments`);
            setAssignments(res.data.data || []);
            setCourseInfo(res.data.course || {});
        } catch (error) {
            console.error('Failed to load assignments:', error);
        } finally {
            setLoading(false);
        }
    }, [offeringId]);

    useEffect(() => {
        loadAssignments();
    }, [loadAssignments]);

    const getStatusInfo = (a) => {
        const isPast = new Date(a.dueDate) < new Date();
        const isSubmitted = a.submitted;
        const isGraded = a.submission?.status === 'graded';

        if (isGraded) return { label: `Graded: ${a.submission.marksAwarded}/${a.totalMarks}`, cls: 'graded', iconCls: 'graded' };
        if (isSubmitted && a.submission?.status === 'late') return { label: 'Submitted (Late)', cls: 'late', iconCls: 'active' };
        if (isSubmitted) return { label: 'Submitted', cls: 'submitted', iconCls: 'active' };
        if (isPast) return { label: 'Missing', cls: 'missing', iconCls: 'overdue' };
        return { label: 'Pending', cls: 'pending', iconCls: 'active' };
    };

    // Count stats
    const submittedCount = assignments.filter(a => a.submitted).length;
    const gradedCount = assignments.filter(a => a.submission?.status === 'graded').length;
    const pendingCount = assignments.length - submittedCount;

    if (loading) {
        return (
            <div>
                <div className="header-with-back">
                    <button className="back-btn-icon" onClick={() => navigate('/student/assignments')}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">{courseCode} - {courseName || 'Loading...'}</h1>
                        <p className="page-subtitle">Loading assignments...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                    <p>Loading assignments...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="header-with-back">
                <button className="back-btn-icon" onClick={() => navigate('/student/assignments')}>
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                </button>
                <div className="page-title-group">
                    <h1 className="page-title">{courseCode || courseInfo.code} - {courseName || courseInfo.name}</h1>
                    <p className="page-subtitle">View and submit assignments for this course</p>
                </div>
            </div>

            {/* Summary Stats */}
            {assignments.length > 0 && (
                <div className="assignment-detail-card" style={{ padding: '1rem 1.25rem' }}>
                    <div className="assignment-course-stats" style={{ margin: 0 }}>
                        <div className="stat-item">
                            <div className="stat-item-label">Total</div>
                            <div className="stat-item-value">{assignments.length}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-item-label">Submitted</div>
                            <div className="stat-item-value" style={{ color: '#3B82F6' }}>{submittedCount}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-item-label">Graded</div>
                            <div className="stat-item-value" style={{ color: '#22C55E' }}>{gradedCount}</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-item-label">Pending</div>
                            <div className="stat-item-value" style={{ color: pendingCount > 0 ? '#F59E0B' : 'var(--slate-500)' }}>{pendingCount}</div>
                        </div>
                    </div>
                </div>
            )}

            {assignments.length === 0 ? (
                <div className="empty-state">
                    <span className="material-symbols-outlined">assignment</span>
                    <h3 style={{ margin: '1rem 0 0.5rem' }}>No Assignments Yet</h3>
                    <p>Your teacher hasn't posted any assignments for this course.</p>
                </div>
            ) : (
                assignments.map(a => {
                    const status = getStatusInfo(a);
                    return (
                        <div
                            key={a.id}
                            className="assignment-item"
                            onClick={() => navigate(`/student/assignments/${offeringId}/detail/${a.id}`, {
                                state: { assignment: a, courseName, courseCode }
                            })}
                        >
                            <div className="assignment-item-header">
                                <div className="assignment-item-left">
                                    <div className={`assignment-icon ${status.iconCls}`}>
                                        <span className="material-symbols-outlined">assignment</span>
                                    </div>
                                    <div className="assignment-item-info">
                                        <h4>{a.title}</h4>
                                        <div className="assignment-item-meta">
                                            <span>Due: {new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            <span>Marks: {a.totalMarks}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className={`assignment-badge ${status.cls}`}>{status.label}</span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default StudentCourseView;

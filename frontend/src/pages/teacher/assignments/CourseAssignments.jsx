import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';

const CourseAssignments = () => {
    const { offeringId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [courseInfo, setCourseInfo] = useState({
        courseName: location.state?.courseName || '',
        courseCode: location.state?.courseCode || ''
    });

    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseInfo.courseName || !courseInfo.courseCode) {
            fetchCourseInfo();
        }
        loadAssignments();
    }, [offeringId]);

    const fetchCourseInfo = async () => {
        try {
            const res = await axios.get(`/api/v1/offerings/${offeringId}`);
            if (res.data.success && res.data.data) {
                setCourseInfo({
                    courseName: res.data.data.courseName || 'Course',
                    courseCode: res.data.data.courseCode || ''
                });
            }
        } catch (error) {
            console.error('Failed to load course info:', error);
        }
    };

    const loadAssignments = async () => {
        try {
            const res = await axios.get(`/api/v1/offerings/${offeringId}/assignments`);
            const sorted = (res.data.data || []).sort((a, b) => (a.assignmentNumber || 0) - (b.assignmentNumber || 0));
            setAssignments(sorted);
        } catch (error) {
            console.error('Failed to load assignments:', error);
        } finally {
            setLoading(false);
        }
    };



    const handleDelete = async (id) => {
        if (!window.confirm('Delete this assignment and all its submissions?')) return;
        try {
            await axios.delete(`/api/v1/assignments/${id}`);
            loadAssignments();
        } catch (err) {
            alert('Failed to delete');
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div className="header-with-back">
                    <button className="back-btn-icon" onClick={() => navigate('/teacher/assignments')}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">{courseInfo.courseCode} {courseInfo.courseCode && '–'} {courseInfo.courseName || 'Course'}</h1>
                        <p className="page-subtitle">Manage assignments for this course</p>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => navigate(`/teacher/assignments/${offeringId}/create`, { state: { courseName: courseInfo.courseName, courseCode: courseInfo.courseCode } })} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}>
                    <span className="material-symbols-outlined">add</span>
                    New Assignment
                </button>
            </div>



            {/* Assignments List */}
            {loading ? (
                <div className="loading-placeholder">Loading assignments...</div>
            ) : assignments.length === 0 ? (
                <div className="empty-state card" style={{ padding: '3rem', textAlign: 'center' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--text-secondary)' }}>assignment</span>
                    <h3>No Assignments Yet</h3>
                    <p style={{ color: 'var(--text-secondary)' }}>Click "New Assignment" to create one.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {assignments.map(a => {
                        const isPast = new Date(a.dueDate) < new Date();
                        return (
                            <div key={a.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                        <span className="material-symbols-outlined" style={{ color: isPast ? '#EF4444' : '#22C55E', fontSize: '1.5rem' }}>assignment</span>
                                        <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {a.assignmentNumber != null ? `Assignment ${a.assignmentNumber} - ` : ''}
                                            {a.title}
                                        </h3>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '799.2px', fontSize: '0.75rem', fontWeight: 600,
                                            background: isPast ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                            color: isPast ? '#EF4444' : '#22C55E'
                                        }}>
                                            {isPast ? 'Past Due' : 'Active'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        <span>Marks: <strong>{a.totalMarks}</strong></span>
                                        <span>Due: <strong>{new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                                        {a.updatedAt && new Date(a.updatedAt) - new Date(a.createdAt) > 60000 && (
                                            <span>Edited: <strong>{new Date(a.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></span>
                                        )}
                                        <span>Submissions: <strong>{a.submissionCount}</strong></span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    <button 
                                        className="btn-secondary-premium" 
                                        onClick={() => navigate(`/teacher/assignments/${offeringId}/submissions/${a.id}`, { state: { assignmentTitle: a.title, totalMarks: a.totalMarks } })} 
                                        style={{ 
                                            display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                            fontSize: '0.85rem', padding: '0.6rem 1.2rem',
                                            color: 'var(--text-primary)',
                                            border: '2px solid var(--border-color)',
                                            borderRadius: '0.75rem',
                                            backgroundColor: 'transparent',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = 'transparent';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>visibility</span>
                                        View Submissions
                                    </button>
                                    <button
                                        className="btn-primary-premium"
                                        onClick={() => navigate(`/teacher/assignments/${offeringId}/edit/${a.id}`)}
                                        style={{ 
                                             display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                             fontSize: '0.85rem', padding: '0.6rem 1.2rem',
                                             backgroundColor: 'var(--primary)', color: 'white', 
                                             border: 'none', borderRadius: '0.75rem',
                                             fontWeight: 600,
                                             cursor: 'pointer',
                                             transition: 'all 0.2s'
                                         }}
                                         onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                         onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                                        Edit
                                    </button>
                                    <button 
                                        className="icon-btn-danger-premium" 
                                        onClick={() => handleDelete(a.id)} 
                                        title="Delete"
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            width: '38px', height: '38px', borderRadius: '0.75rem',
                                            border: 'none', background: 'rgba(239, 68, 68, 0.1)',
                                            color: '#EF4444', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#EF4444';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                            e.currentTarget.style.color = '#EF4444';
                                        }}
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CourseAssignments;

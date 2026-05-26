import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const EditAssignment = () => {
    const { offeringId, assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [courseInfo, setCourseInfo] = useState({
        courseName: location.state?.courseName || '',
        courseCode: location.state?.courseCode || ''
    });

    const [assignmentNumber, setAssignmentNumber] = useState(null);
    const [form, setForm] = useState({ title: '', description: '', totalMarks: '', dueDate: '' });
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseInfo.courseName || !courseInfo.courseCode) {
            fetchCourseInfo();
        }
        fetchAssignmentDetails();
    }, [offeringId, assignmentId]);

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

    const fetchAssignmentDetails = async () => {
        try {
            const res = await axios.get(`/api/v1/assignments/${assignmentId}`);
            const data = res.data.data;
            if (data) {
                setAssignmentNumber(data.assignmentNumber);
                
                // Format dueDate for datetime-local input
                let formattedDate = '';
                if (data.dueDate) {
                    const dateObj = new Date(data.dueDate);
                    const tzOffset = dateObj.getTimezoneOffset() * 60000;
                    formattedDate = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);
                }

                setForm({
                    title: data.title || '',
                    description: data.description || '',
                    totalMarks: data.totalMarks || '',
                    dueDate: formattedDate
                });
            }
        } catch (error) {
            console.error('Failed to fetch assignment details:', error);
            setFormError('Failed to load assignment data.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        setFormError('');
        if (!form.title || !form.totalMarks || !form.dueDate) {
            setFormError('Title, Total Marks, and Due Date are required.');
            return;
        }
        setSubmitting(true);
        try {
            await axios.put(`/api/v1/assignments/${assignmentId}`, form);
            navigate(`/teacher/assignments/${offeringId}`, { state: { courseName: courseInfo.courseName, courseCode: courseInfo.courseCode } });
        } catch (error) {
            setFormError(error.response?.data?.error || 'Failed to update assignment');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="header-with-back">
                    <button
                        className="back-btn-icon"
                        onClick={() => navigate(`/teacher/assignments/${offeringId}`, { state: { courseName: courseInfo.courseName, courseCode: courseInfo.courseCode } })}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">Edit Assignment</h1>
                        <p className="page-subtitle">Loading...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                    <p>Loading assignment...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="header-with-back">
                <button
                    className="back-btn-icon"
                    onClick={() => navigate(`/teacher/assignments/${offeringId}`, { state: { courseName: courseInfo.courseName, courseCode: courseInfo.courseCode } })}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                </button>
                <div className="page-title-group">
                    <h1 className="page-title">Edit Assignment</h1>
                    <p className="page-subtitle">{courseInfo.courseCode} {courseInfo.courseCode && '–'} {courseInfo.courseName || 'Course'}</p>
                </div>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
                {formError && <p style={{ color: '#EF4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{formError}</p>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Assignment Number — read-only */}
                    <div className="form-group">
                        <label>Assignment No.</label>
                        <input
                            type="text"
                            value={assignmentNumber !== null ? `Assignment ${assignmentNumber}` : 'Loading...'}
                            readOnly
                            style={{
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                cursor: 'not-allowed',
                                fontWeight: 600,
                                border: '2px solid var(--border-color, #E2E8F0)'
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <label>Title *</label>
                        <input type="text" placeholder="Assignment title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label>Total Marks *</label>
                        <input type="number" min="1" max="100" placeholder="e.g. 100" value={form.totalMarks} onChange={e => {
                            let val = e.target.value;
                            if (val !== '' && Number(val) > 100) val = '100';
                            setForm({ ...form, totalMarks: val });
                        }} />
                    </div>
                    <div className="form-group">
                        <label>Due Date & Time *</label>
                        <input type="datetime-local" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label>Description</label>
                        <textarea rows="4" placeholder="Assignment details and instructions..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '2px solid var(--border-color, #E2E8F0)', borderRadius: '0.75rem', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
                    </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1.5rem' }}>
                    <button onClick={() => navigate(`/teacher/assignments/${offeringId}`, { state: { courseName: courseInfo.courseName, courseCode: courseInfo.courseCode } })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500 }}>Cancel</button>
                    <button onClick={handleUpdate} disabled={submitting} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: '#fff', border: 'none', padding: '0.625rem 1.25rem', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', opacity: submitting ? 0.6 : 1 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>save</span>
                        {submitting ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <style>{`
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .form-group label {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-primary) !important;
                    display: block;
                }
                .form-group input {
                    padding: 0.75rem 1rem;
                    border: 2px solid var(--border-color, #E2E8F0) !important;
                    border-radius: 0.75rem;
                    background: var(--bg-card) !important;
                    color: var(--text-primary) !important;
                    font-size: 0.9rem;
                    outline: none;
                    width: 100%;
                    transition: all 0.2s ease;
                }
                .form-group input:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
                }
                .form-group input::placeholder, 
                .form-group textarea::placeholder {
                    color: var(--text-secondary) !important;
                    opacity: 0.6;
                }
                /* Chrome, Safari, Edge, Opera */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                /* Firefox */
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>
        </div>
    );
};

export default EditAssignment;

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MarkResults.css';

const MarkResults = () => {
    const { offeringId } = useParams();
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState('');
    const [offeringStatus, setOfferingStatus] = useState('pending');

    const GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', 'P'];

    useEffect(() => {
        loadData();
    }, [offeringId]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Fetch students
            const res = await axios.get(`/api/v1/teachers/offerings/${offeringId}/students`);
            const offeringsRes = await axios.get('/api/v1/teachers/offerings');
            const currentOffering = offeringsRes.data.data.find(o => o.id === parseInt(offeringId));

            if (currentOffering) {
                setOfferingStatus(currentOffering.resultStatus || 'pending');
            }

            const data = res.data.data.map(s => ({
                ...s,
                grade: s.grade || ''
            }));
            setStudents(data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load data:', err);
            setError('Failed to load data.');
            setLoading(false);
        }
    };

    const handleInputChange = (index, field, value) => {
        const newStudents = [...students];
        newStudents[index][field] = value;
        setStudents(newStudents);
    };

    const handleSubmit = async () => {
        if (!window.confirm('Are you sure you want to submit these grades? This will send them to the Admin for approval.')) {
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccessMsg('');

        try {
            const payload = students.map(s => ({
                enrollmentId: s.id,
                grade: s.grade
            }));

            await axios.post(`/api/v1/teachers/offerings/${offeringId}/results`, { results: payload });
            setSuccessMsg('Results submitted successfully!');
            setTimeout(() => {
                navigate('/teacher/results');
            }, 2000);
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.error || 'Failed to submit results. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const isLocked = offeringStatus === 'submitted' || offeringStatus === 'approved';

    if (loading) return (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
            <span className="material-symbols-outlined rotating" style={{ fontSize: '3rem', marginBottom: '1rem' }}>sync</span>
            <p>Loading students...</p>
        </div>
    );

    return (
        <div className="dashboard-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div className="header-with-back">
                    <button className="back-btn-icon" onClick={() => navigate('/teacher/results')}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">
                            {isLocked ? 'View Results' : 'Enter Grades'}
                        </h1>
                        <p className="page-subtitle">
                            {isLocked
                                ? `Grades have been ${offeringStatus}. View only.`
                                : 'Enter Letter Grade.'}
                        </p>
                    </div>
                </div>
                <div>
                    <span className={`status-badge ${offeringStatus}`}>
                        {offeringStatus.toUpperCase()}
                    </span>
                </div>
            </div>

            {offeringStatus === 'rejected' && (
                <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg border border-red-200" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="material-symbols-outlined">warning</span>
                    <div>
                        <strong>Attention:</strong> Previous results were rejected by Admin. Please review and resubmit.
                    </div>
                </div>
            )}

            {error && <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg">{error}</div>}
            {successMsg && <div className="p-4 mb-4 text-green-700 bg-green-100 rounded-lg">{successMsg}</div>}

            <div className="grade-table-container">
                <table className="grade-table">
                    <thead>
                        <tr>
                            <th>Roll No</th>
                            <th>Name</th>
                            <th style={{ width: '120px' }}>Grade</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr key={student.id}>
                                <td style={{ fontWeight: 'bold' }}>{student.student?.rollNumber}</td>
                                <td style={{ fontWeight: 500 }}>{student.student?.user?.firstName} {student.student?.user?.lastName}</td>
                                <td>
                                    <select
                                        className="grade-select"
                                        value={student.grade}
                                        onChange={(e) => handleInputChange(index, 'grade', e.target.value)}
                                        disabled={isLocked}
                                    >
                                        <option value="">Select</option>
                                        {GRADES.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {!isLocked && (
                <div className="grade-footer">
                    {!students.every(s => s.grade) && (
                        <span className="grade-warning-badge">
                            Grade all students to submit
                        </span>
                    )}
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !students.every(s => s.grade)}
                        className={`submit-grade-btn ${submitting || !students.every(s => s.grade) ? 'disabled' : ''}`}
                    >
                        {submitting ? (
                            <>
                                <span className="material-symbols-outlined rotating">sync</span>
                                Submitting...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                {offeringStatus === 'rejected' ? 'Resubmit Results' : 'Submit Results'}
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default MarkResults;

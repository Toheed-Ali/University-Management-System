import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import './OfferingStudents.css';

const OfferingStudents = () => {
    const [searchParams] = useSearchParams();
    const offeringId = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [offeringDetails, setOfferingDetails] = useState(null);
    const [semesterGroups, setSemesterGroups] = useState({});
    const [processingBulk, setProcessingBulk] = useState(false);

    useEffect(() => {
        if (offeringId) {
            initPage();
        }
    }, [offeringId]);

    const initPage = async () => {
        try {
            setLoading(true);
            const details = await loadCourseContext();
            if (details) {
                await loadOfferingStudents(details); // Load only this offering's students
            }
        } catch (err) {
            console.error('Init error:', err);
            setError('Failed to initialize page');
        } finally {
            setLoading(false);
        }
    };

    const loadCourseContext = async () => {
        try {
            const res = await axios.get(`/api/v1/offerings/${offeringId}`);
            const offering = res.data.data || res.data;
            setOfferingDetails(offering);
            return offering;
        } catch (err) {
            console.error('Failed to load offering details:', err);
            setError('Failed to load offering details');
            return null;
        }
    };

    const loadOfferingStudents = async (details) => {
        try {
            // Direct fetch for the specific offering ID
            const resp = await axios.get(`/api/v1/offerings/${offeringId}/students`);
            const students = resp.data.data || [];

            // Group students by semester (legacy grouping structure kept for UI compatibility)
            const groups = {};
            students.forEach(student => {
                const stdSem = student.studentSemester !== null && student.studentSemester !== undefined
                    ? student.studentSemester
                    : 'Unknown';

                if (!groups[stdSem]) {
                    groups[stdSem] = [];
                }
                // Add offering metadata for actions
                groups[stdSem].push({
                    ...student,
                    offeringId: parseInt(offeringId),
                    // Use passed details for section name if available, otherwise fall back to state/student data
                    sectionName: details?.sectionName || details?.section?.name || offeringDetails?.sectionName
                });
            });

            setSemesterGroups(groups);
        } catch (err) {
            console.error('Load students error:', err);
            setError('Error loading students');
        }
    };

    const updateStatus = async (offId, studentId, newStatus, silent = false) => {
        try {
            const response = await axios.put(`/api/v1/offerings/${offId}/students/${studentId}/status`, {
                status: newStatus
            });

            if (response.data.success !== false) {
                if (!silent) {
                    await initPage();
                }
                return true;
            } else {
                if (!silent) alert('Failed to update status: ' + (response.data.error || 'Unknown error'));
                return false;
            }
        } catch (err) {
            console.error('Update status error:', err);
            if (!silent) alert('Error updating status');
            return false;
        }
    };

    const handleBulkUpdate = async (semesterName, newStatus) => {
        const students = semesterGroups[semesterName];
        if (!students || students.length === 0) return;

        const pendingStudents = students.filter(s => s.status !== newStatus);
        if (pendingStudents.length === 0) {
            alert(`All students in ${semesterName} are already ${newStatus}.`);
            return;
        }

        if (!window.confirm(`Are you sure you want to ${newStatus === 'enrolled' ? 'Accept' : 'Reject'} all ${pendingStudents.length} students in ${semesterName}?`)) {
            return;
        }

        setProcessingBulk(true);
        try {
            for (const student of pendingStudents) {
                await updateStatus(student.offeringId, student.studentId, newStatus, true);
            }
            alert(`Successfully processed ${pendingStudents.length} students.`);
        } catch (err) {
            console.error('Bulk update error:', err);
            alert('An error occurred during bulk update.');
        } finally {
            setProcessingBulk(false);
            await initPage();
        }
    };

    if (loading && !processingBulk) {
        return (
            <div className="dashboard-container" style={{ padding: '4rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <span className="material-symbols-outlined rotating" style={{ fontSize: '2.5rem', color: 'var(--primary)' }}>sync</span>
                    <p>Loading enrollment details...</p>
                </div>
            </div>
        );
    }

    const sortedSemesters = Object.keys(semesterGroups).sort((a, b) => {
        if (a === 'Unknown') return 1;
        if (b === 'Unknown') return -1;
        return parseInt(a) - parseInt(b);
    });

    return (
        <div className="dashboard-container offering-students-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between', width: '100%' }}>
                    <div className="header-with-back">
                        <Link to="/admin/offerings" className="back-btn-icon" style={{ marginTop: '3.2px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                        </Link>
                        <div className="page-title-group">
                            <h1 className="page-title">Manage Enrollments</h1>
                            <p className="page-subtitle">
                                {offeringDetails ? `${offeringDetails.courseName || offeringDetails.course?.name} (${offeringDetails.courseCode || offeringDetails.course?.code}) - All Students by Semester` : 'Loading course details...'}
                            </p>
                        </div>
                    </div>

                    {offeringDetails && sortedSemesters.length > 0 && ['submitted', 'approved', 'rejected'].includes(offeringDetails.resultStatus) && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Accept results? This will publish grades to students.')) {
                                        try {
                                            await axios.post(`/api/v1/offerings/${offeringId}/results/approve`);
                                            alert('Results approved.');
                                            initPage();
                                        } catch (e) {
                                            alert('Failed to approve results');
                                        }
                                    }
                                }}
                                className="btn-sm"
                                style={{ background: '#16A34A', color: 'white', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <span className="material-symbols-outlined">check_circle</span>
                                Accept Grades
                            </button>
                            <button
                                onClick={async () => {
                                    if (window.confirm('Reject results? Teacher will be notified.')) {
                                        try {
                                            await axios.post(`/api/v1/offerings/${offeringId}/results/reject`);
                                            alert('Results rejected.');
                                            initPage();
                                        } catch (e) {
                                            alert('Failed to reject results');
                                        }
                                    }
                                }}
                                className="btn-sm"
                                style={{ background: '#DC2626', color: 'white', border: 'none', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <span className="material-symbols-outlined">cancel</span>
                                Reject Grades
                            </button>
                        </div>
                    )}
                </div>
            </div>



            {error && <div className="alert alert-error show" style={{ marginBottom: '1.5rem' }}>{error}</div>}

            {/* Grade Distribution Summary */}
            {offeringDetails && ['submitted', 'approved', 'rejected'].includes(offeringDetails.resultStatus) && (
                <div className="grade-summary-card">
                    <h3 className="grade-summary-title">
                        <span className="material-symbols-outlined">analytics</span>
                        Grade Distribution Summary
                    </h3>
                    <div className="grade-grid">
                        {(() => {
                            const distribution = {
                                'A+': 0, 'A': 0, 'A-': 0,
                                'B+': 0, 'B': 0, 'B-': 0,
                                'C+': 0, 'C': 0, 'C-': 0,
                                'D+': 0, 'D': 0, 'D-': 0,
                                'F': 0, 'P': 0
                            };

                            Object.values(semesterGroups).flat().forEach(student => {
                                if (student.grade && distribution.hasOwnProperty(student.grade)) {
                                    distribution[student.grade]++;
                                }
                            });

                            return Object.entries(distribution).map(([label, count]) => (
                                <div
                                    key={label}
                                    className={`grade-stat-box ${count > 0 ? 'has-values' : ''} ${label === 'F' ? 'fail-grade' : ''}`}
                                >
                                    <span className="grade-label">{label}</span>
                                    <span className="grade-count">{count}</span>
                                </div>
                            ));
                        })()}
                    </div>
                </div>
            )}

            <div id="studentsContainer">
                {processingBulk && (
                    <div className="card" style={{ padding: '1.5rem', textAlign: 'center', background: 'var(--slate-50)', color: 'var(--slate-600)', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                            <span className="material-symbols-outlined rotating" style={{ color: 'var(--primary)' }}>sync</span>
                            Processing bulk updates... Please wait.
                        </div>
                    </div>
                )}

                {sortedSemesters.length === 0 ? (
                    !loading && (
                        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>group_off</span>
                            <p>No students enrolled for this course.</p>
                        </div>
                    )
                ) : (
                    sortedSemesters.map(semester => {
                        const students = semesterGroups[semester];
                        const sortedStudents = [...students].sort((a, b) => {
                            if (a.status === 'pending' && b.status !== 'pending') return -1;
                            if (a.status !== 'pending' && b.status === 'pending') return 1;
                            return (a.name || '').localeCompare(b.name || '');
                        });

                        const semesterLabel = semester === 'Unknown'
                            ? 'Semester Not Set'
                            : `Semester ${semester} Students`;

                        return (
                            <div key={semester} className="card" style={{ padding: '0', overflow: 'hidden', marginBottom: '2rem' }}>
                                <div className="semester-header">
                                    <h3 className="semester-title" style={{ margin: 0, color: 'var(--slate-800)', fontSize: '1.1rem', fontWeight: 600 }}>
                                        {semesterLabel}
                                        <span className="student-count" style={{ marginLeft: '0.5rem', color: 'var(--slate-500)', fontWeight: 400, fontSize: '0.9rem' }}>
                                            ({students.length} student{students.length !== 1 ? 's' : ''})
                                        </span>
                                    </h3>

                                    <div className="bulk-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                                        <button
                                            onClick={() => handleBulkUpdate(semester, 'enrolled')}
                                            className="btn-sm success"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                            disabled={processingBulk}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>check_circle</span>
                                            Accept All
                                        </button>
                                        <button
                                            onClick={() => handleBulkUpdate(semester, 'rejected')}
                                            className="btn-sm danger"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                            disabled={processingBulk}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>cancel</span>
                                            Reject All
                                        </button>
                                    </div>
                                </div>
                                <div className="table-responsive">
                                    <table className="enrollment-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Student Name</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Roll Number</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Section</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Email</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Grade</th>
                                                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Status</th>
                                                <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--slate-700)', borderBottom: '2px solid var(--slate-200)' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedStudents.map((student, sIdx) => (
                                                <tr key={`${student.studentId}-${sIdx}`} style={{ borderBottom: '1px solid var(--slate-100)' }}>
                                                    <td className="student-name-cell" style={{ padding: '1rem', fontWeight: 500, color: 'var(--slate-800)' }}>{student.name}</td>
                                                    <td className="student-roll-cell" style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--slate-600)' }}>{student.rollNumber}</td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className="section-badge">{student.sectionName || 'N/A'}</span>
                                                    </td>
                                                    <td className="student-email-cell" style={{ padding: '1rem', color: 'var(--slate-600)' }}>{student.email}</td>
                                                    <td className="student-grade-cell" style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--slate-800)' }}>
                                                        {student.grade || '-'}
                                                    </td>
                                                    <td style={{ padding: '1rem' }}>
                                                        <span className={`status-badge ${student.status}`}>
                                                            {student.status === 'completed' ? 'Graded' : student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                        {student.status === 'pending' ? (
                                                            <>
                                                                <button
                                                                    onClick={() => updateStatus(student.offeringId, student.studentId, 'enrolled')}
                                                                    className="btn-sm success"
                                                                    style={{ marginRight: '0.5rem' }}
                                                                    disabled={processingBulk}
                                                                >
                                                                    Accept
                                                                </button>
                                                                <button
                                                                    onClick={() => updateStatus(student.offeringId, student.studentId, 'rejected')}
                                                                    className="btn-sm danger"
                                                                    disabled={processingBulk}
                                                                >
                                                                    Reject
                                                                </button>
                                                            </>
                                                        ) : student.status === 'completed' ? (
                                                            <span style={{ color: 'var(--success)', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                                                <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>check_circle</span>
                                                                Grade Submitted
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateStatus(student.offeringId, student.studentId, student.status === 'enrolled' ? 'rejected' : 'enrolled')}
                                                                className="btn-sm secondary"
                                                                disabled={processingBulk}
                                                            >
                                                                {student.status === 'enrolled' ? 'Reject' : 'Approve'}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default OfferingStudents;

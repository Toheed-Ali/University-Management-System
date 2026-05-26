import { useState, useEffect } from 'react';
import axios from 'axios';
import './StudentDashboard.css';
import './Transcript.css';

const Transcript = () => {
    const [audit, setAudit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTranscript();
    }, []);

    const loadTranscript = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/students/me/transcript');
            setAudit(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load transcript:', err);
            setError('Failed to load transcript.');
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>Loading transcript...</div>;
    if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
    if (!audit) return <div className="p-8 text-center" style={{ color: 'var(--text-primary)' }}>No data found.</div>;

    return (
        <div className="dashboard-container">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Academic Transcript</h1>
                    <p className="page-subtitle">Detailed record of your academic performance.</p>
                </div>
                <div className="text-right">
                    <p className="text-sm" style={{ color: 'var(--slate-500)' }}>CGPA</p>
                    <h2 className="text-3xl font-bold text-primary">{audit.cgpa}</h2>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {audit.semesters.map((sem) => (
                    <div key={sem.semester} className="transcript-card">
                        <div className="semester-header">
                            <h3 className="semester-title">Semester {sem.semester}</h3>
                            <div className="semester-stats">
                                <span><span className="font-semibold">Credits:</span> {sem.totalCredits}</span>
                                <span><span className="font-semibold">SGPA:</span> {sem.sgpa}</span>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="transcript-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Course Name</th>
                                        <th className="text-center" style={{ width: '64px' }}>Cr</th>
                                        <th className="text-center" style={{ width: '80px' }}>Grade</th>
                                        <th className="text-center" style={{ width: '64px' }}>Pts</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sem.courses.map((course, idx) => (
                                        <tr key={idx}>
                                            <td className="font-mono" style={{ color: 'var(--slate-500)' }}>{course.courseCode}</td>
                                            <td className="font-medium">{course.courseName}</td>
                                            <td className="text-center">{course.credits}</td>
                                            <td className="text-center">
                                                <span className={`grade-badge ${course.grade === 'Pending' ? 'grade-pending' : (course.grade === 'F' || course.status === 'failed' ? 'grade-fail' : 'grade-pass')}`}>
                                                    {course.grade || '-'}
                                                </span>
                                            </td>
                                            <td className="text-center">{course.gradePoints}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Transcript;

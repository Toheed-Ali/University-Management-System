import { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './MarkAttendance.css';

const MarkAttendance = () => {
    const { lectureId } = useParams();
    const { state } = useLocation();
    const navigate = useNavigate();

    const [students, setStudents] = useState([]);
    const [attendanceData, setAttendanceData] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    // Get info from state or fallback
    const offeringId = state?.offeringId;
    const lectureNumber = state?.lectureNumber || '-';
    const courseName = state?.courseName || 'Course';
    const lectureDate = state?.lectureDate;

    useEffect(() => {
        if (!lectureId || !offeringId) {
            setError('Missing lecture or offering information');
            setLoading(false);
            return;
        }
        loadData();
    }, [lectureId, offeringId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch students enrolled in the offering
            const studentsRes = await axios.get(`/api/v1/teachers/offerings/${offeringId}/students`);
            let enrolledStudents = studentsRes.data;
            if (enrolledStudents && Array.isArray(enrolledStudents.data)) {
                enrolledStudents = enrolledStudents.data;
            } else if (!Array.isArray(enrolledStudents)) {
                enrolledStudents = [];
            }

            // Fetch existing attendance for this lecture
            const attendanceRes = await axios.get(`/api/v1/attendance/lecture/${lectureId}`);
            let existingAttendance = attendanceRes.data;
            if (existingAttendance && Array.isArray(existingAttendance.data)) {
                existingAttendance = existingAttendance.data;
            } else if (!Array.isArray(existingAttendance)) {
                existingAttendance = [];
            }

            // Initialize attendance map
            const initialMap = {};
            // Default to absent, then override with existing data if any
            enrolledStudents.forEach(enrollment => {
                const student = enrollment.student || enrollment.Student;
                if (student) {
                    initialMap[student.id] = false;
                }
            });

            existingAttendance.forEach(att => {
                if (att && att.studentId) {
                    initialMap[att.studentId] = att.status === 'present';
                }
            });

            setStudents(enrolledStudents);
            setAttendanceData(initialMap);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load attendance data:', err);
            setError('Failed to load students. Please try again.');
            setLoading(false);
        }
    };

    const updateAttendance = (studentId, isPresent) => {
        setAttendanceData(prev => ({
            ...prev,
            [studentId]: isPresent
        }));
    };

    const submitAttendance = async () => {
        if (!lectureId) return;

        const attendanceRecords = Object.entries(attendanceData).map(([studentId, isPresent]) => ({
            studentId: parseInt(studentId),
            status: isPresent ? 'present' : 'absent'
        }));

        if (attendanceRecords.length === 0) {
            alert('No attendance data to submit');
            return;
        }

        try {
            setSubmitting(true);
            await axios.post('/api/v1/attendance/mark', {
                lectureId: parseInt(lectureId),
                attendanceRecords
            });

            alert('Attendance submitted successfully!');
            navigate('/teacher/attendance');
        } catch (err) {
            console.error('Failed to submit attendance:', err);
            alert('Failed to submit attendance. Please try again.');
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="loading-placeholder" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
                    Loading students...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="header-with-back">
                    <button className="back-btn-icon" onClick={() => navigate('/teacher/attendance')}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">Attendance - Error</h1>
                        <p className="page-subtitle" style={{ color: 'var(--red-500)' }}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="header-with-back">
                <button
                    className="back-btn-icon"
                    onClick={() => navigate('/teacher/attendance')}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                </button>
                <div className="page-title-group">
                    <h1 className="page-title">Mark Attendance - Lecture {lectureNumber}</h1>
                    <p className="page-subtitle">
                        {courseName} | {lectureDate ? new Date(lectureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date'}
                    </p>
                </div>
            </div>

            {/* Attendance Marking Section */}
            <section>
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="material-symbols-outlined">group</span>
                        Enrolled Students
                    </h2>
                </div>
                <div id="studentsAttendanceList">
                    {students.length === 0 ? (
                        <div className="empty-state">
                            <span className="material-symbols-outlined">group_off</span>
                            <p>No students enrolled in this course.</p>
                        </div>
                    ) : (
                        students.map(enrollment => {
                            const student = enrollment.student || enrollment.Student;
                            const isPresent = attendanceData[student.id] || false;

                            return (
                                <div key={student.id} className="student-attendance-row">
                                    <div>
                                        <h4 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {student.user?.firstName} {student.user?.lastName}
                                        </h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {student.rollNumber}
                                        </p>
                                    </div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                        {student.user?.email}
                                    </div>
                                    <div>
                                        <span className="attendance-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                            ATTENDANCE
                                        </span>
                                    </div>
                                    <div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={isPresent}
                                                onChange={(e) => updateAttendance(student.id, e.target.checked)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <button
                    className="submit-attendance-btn"
                    id="submitAttendanceBtn"
                    onClick={submitAttendance}
                    disabled={submitting || students.length === 0}
                >
                    {submitting ? 'Submitting...' : 'Submit Attendance'}
                </button>
            </section>
        </div>
    );
};

export default MarkAttendance;

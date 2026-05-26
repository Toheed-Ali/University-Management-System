import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './CourseStudents.css';

const CourseStudents = () => {
    const { offeringId } = useParams();
    const [students, setStudents] = useState([]);
    const [offering, setOffering] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, [offeringId]);

    const loadData = async () => {
        try {
            setLoading(true);

            // 1. Fetch offering details (from all offerings)
            const offeringsRes = await axios.get('/api/v1/teachers/offerings');
            const currentOffering = offeringsRes.data.data.find(o => o.id === parseInt(offeringId));
            setOffering(currentOffering);

            // 2. Fetch enrolled students (already contains attendancePercentage from backend)
            const studentsRes = await axios.get(`/api/v1/teachers/offerings/${offeringId}/students`);

            const enrolledWithAttendance = studentsRes.data.data || [];
            setStudents(enrolledWithAttendance);
            setLoading(false);
        } catch (err) {
            console.error('Failed to load students:', err);
            setError('Error loading students. Please try again.');
            setLoading(false);
        }
    };

    const getPercentageColor = (percentage) => {
        if (percentage >= 75) return 'var(--green-500)';
        return 'var(--red-500)';
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <Link to="/teacher/courses" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none' }}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <h1 className="page-title" style={{ margin: 0 }}>
                            Enrolled Students
                        </h1>
                    </div>
                    <p className="page-subtitle" id="courseSubtitle">
                        {offering ? `Course: ${offering.courseCode} - ${offering.courseName} | Section ${offering.sectionName}` : 'Loading course details...'}
                    </p>
                </div>
            </div>

            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="students-table">
                    <thead>
                        <tr>
                            <th>Sr.No</th>
                            <th>Roll Number</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Semester</th>
                            <th>Attendance %</th>
                        </tr>
                    </thead>
                    <tbody id="studentsBody">
                        {loading ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>
                                    Loading students...
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--red-500)' }}>
                                    {error}
                                </td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No students enrolled in this course yet.
                                </td>
                            </tr>
                        ) : (
                            students.map((enrollment, index) => (
                                <tr key={enrollment.id || index}>
                                    <td>{index + 1}</td>
                                    <td><strong>{enrollment.student.rollNumber}</strong></td>
                                    <td>{enrollment.student.user.firstName} {enrollment.student.user.lastName}</td>
                                    <td>{enrollment.student.user.email}</td>
                                    <td>{enrollment.student.semester || '-'}</td>
                                    <td>
                                        <strong style={{ color: getPercentageColor(enrollment.attendancePercentage) }}>
                                            {enrollment.attendancePercentage.toFixed(1)}%
                                        </strong>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CourseStudents;

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './CourseRegistration.css';

const CourseRegistration = () => {
    const [profile, setProfile] = useState(null);
    const [enrolledCourses, setEnrolledCourses] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [windowStatus, setWindowStatus] = useState({ isOpen: false, statusText: 'Checking...', dateText: '', icon: 'calendar_clock', color: 'var(--slate-500)', bg: 'rgba(100, 116, 139, 0.1)' });
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const checkRegistrationWindow = useCallback(async (studentProfile) => {
        try {
            const res = await axios.get('/api/v1/settings/registration-window');
            const data = res.data.data;

            if (!data || !data.startDate || !data.endDate) {
                setWindowStatus({ isOpen: false, statusText: 'Not Scheduled', dateText: '', icon: 'event_busy', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' });
                return false;
            }

            const now = new Date();
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);

            // Also check student override if available
            let studentStart = studentProfile?.registrationStartDate ? new Date(studentProfile.registrationStartDate) : null;
            let studentEnd = studentProfile?.registrationEndDate ? new Date(studentProfile.registrationEndDate) : null;

            let finalIsOpen = (now >= start && now <= end);
            if (studentStart && studentEnd) {
                if (now >= studentStart && now <= studentEnd) finalIsOpen = true;
            }

            if (now < start && (!studentStart || now < studentStart)) {
                setWindowStatus({ isOpen: false, statusText: 'Opens Soon', dateText: start.toLocaleDateString(), icon: 'event_upcoming', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' });
                return false;
            } else if (now > end && (!studentEnd || now > studentEnd)) {
                setWindowStatus({ isOpen: false, statusText: 'Closed', dateText: end.toLocaleDateString(), icon: 'event_busy', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' });
                return false;
            } else {
                setWindowStatus({
                    isOpen: true,
                    statusText: 'Open',
                    dateText: `until ${end.toLocaleDateString()} ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                    icon: 'event_available',
                    color: '#22C55E',
                    bg: 'rgba(34, 197, 94, 0.1)'
                });
                return true;
            }
        } catch (error) {
            console.error('Failed to check window:', error);
            setWindowStatus({ isOpen: false, statusText: 'Error', dateText: '', icon: 'error', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' });
            return false;
        }
    }, []);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Load Profile
            const profileRes = await axios.get('/api/v1/students/me');
            const studentProfile = profileRes.data.data;
            setProfile(studentProfile);

            // 2. Window Check
            const isOpen = await checkRegistrationWindow(studentProfile);

            // 3. Load Courses
            const [enrolledRes, availableRes] = await Promise.all([
                axios.get('/api/v1/students/me/courses'),
                isOpen ? axios.get('/api/v1/students/me/available-courses') : Promise.resolve({ data: { data: [] } })
            ]);

            setEnrolledCourses(enrolledRes.data.data || []);
            setAvailableCourses(availableRes.data.data || []);
        } catch (error) {
            console.error('Failed to load registration data:', error);
        } finally {
            setLoading(false);
        }
    }, [checkRegistrationWindow]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddCourse = async (offeringId) => {
        if (!window.confirm('Add this course to your registration?')) return;
        setIsProcessing(true);
        try {
            await axios.post('/api/v1/students/me/courses', { offeringId });
            await loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to add course');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDropCourse = async (offeringId) => {
        if (!window.confirm('Are you sure you want to drop this course?')) return;
        setIsProcessing(true);
        try {
            await axios.delete(`/api/v1/students/me/courses/${offeringId}`);
            await loadData();
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to drop course');
        } finally {
            setIsProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--slate-400)', margin: '2rem' }}>
                <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                <p>Loading course data...</p>
            </div>
        );
    }

    // Combine and sort logic
    const allEnrolledIds = enrolledCourses.map(c => c.offeringId);

    // Formatted lists for rendering
    const allCourses = [
        ...enrolledCourses.map(c => ({
            ...c,
            displayStatus: c.status === 'pending' ? 'Pending Approval' : (c.status === 'rejected' ? 'Rejected' : 'Enrolled'),
            isEnrolled: true
        })),
        ...availableCourses.filter(c => !allEnrolledIds.includes(c.id)).map(c => ({
            ...c,
            offeringId: c.id,
            displayStatus: 'Not Enrolled',
            isEnrolled: false
        }))
    ];

    allCourses.sort((a, b) => a.courseCode.localeCompare(b.courseCode));

    // Recommend filtering
    const recommended = allCourses.filter(c => {
        const sameSemester = c.semester === profile?.semester;

        // Exact matching logic from prototype
        let sameBatch = true;
        if (c.batchId && profile?.batchId) {
            sameBatch = (c.batchId === profile.batchId);
        } else if (c.batch && profile?.batch) {
            sameBatch = c.batch.toString().toLowerCase().trim() === profile.batch.toString().toLowerCase().trim();
        }

        let sameSection = true;
        if (c.sectionId && profile?.sectionId) {
            sameSection = (c.sectionId === profile.sectionId);
        } else if (c.section && profile?.section) {
            sameSection = c.section.toString().toLowerCase().trim() === profile.section.toString().toLowerCase().trim();
        }

        return sameSemester && sameBatch && sameSection;
    });

    const others = allCourses.filter(c => !recommended.find(r => r.offeringId === c.offeringId));

    const enrolledOrPending = enrolledCourses.filter(e => e.status === 'enrolled' || e.status === 'pending');
    const totalSelectedCredits = enrolledOrPending.reduce((sum, c) => sum + (c.credits || 0), 0);
    const maxSemCredits = profile?.department?.maxCreditsPerSemester || 18;
    const creditsRemaining = maxSemCredits - totalSelectedCredits;

    const renderTable = (title, courses) => (
        <div key={title}>
            <div className="section-header" style={{ marginTop: '2rem', marginBottom: '1rem' }}>
                <h2 className="section-title" style={{ fontSize: '1.1rem', fontWeight: 600 }}>{title}</h2>
            </div>
            {courses.length === 0 ? (
                <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                    No courses found in this category.
                </div>
            ) : (
                <div className="card" style={{ padding: '0', overflow: 'hidden', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="course-table">
                            <thead>
                                <tr>
                                    <th>Sr.No</th>
                                    <th>Course Code</th>
                                    <th>Course Name</th>
                                    <th>Cr. Hrs.</th>
                                    <th>Section</th>
                                    <th>Instructor</th>
                                    <th>Semester</th>
                                    <th>Status</th>
                                    {windowStatus.isOpen && <th>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {courses.map((course, index) => {
                                    let statusBadgeClass = 'badge-not-enrolled';
                                    if (course.isEnrolled) {
                                        if (course.displayStatus === 'Pending Approval') statusBadgeClass = 'badge-pending-approval';
                                        else if (course.displayStatus === 'Rejected') statusBadgeClass = 'badge-rejected';
                                        else statusBadgeClass = 'badge-enrolled';
                                    }

                                    const isRejected = course.displayStatus === 'Rejected';
                                    const actionBtnClass = course.isEnrolled ? 'btn-drop' : 'btn-add';
                                    const actionBtnText = course.isEnrolled ? 'Drop Course' : 'Add Course';
                                    const actionFn = course.isEnrolled ? handleDropCourse : handleAddCourse;

                                    return (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>{course.courseCode}</td>
                                            <td>{course.courseName}</td>
                                            <td>{course.credits}</td>
                                            <td>{course.section || 'A'}</td>
                                            <td>{course.teacherName || 'TBA'}</td>
                                            <td>{course.semester || '-'}</td>
                                            <td><span className={`status-badge ${statusBadgeClass}`}>{course.displayStatus}</span></td>
                                            {windowStatus.isOpen && (
                                                <td>
                                                    <button
                                                        onClick={() => actionFn(course.offeringId)}
                                                        className={`action-btn ${actionBtnClass}`}
                                                        disabled={isRejected || isProcessing}
                                                        style={isRejected ? { backgroundColor: '#94a3b8', cursor: 'not-allowed' } : {}}
                                                    >
                                                        {isRejected ? 'Rejected' : actionBtnText}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="course-registration-page">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.875rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        Semester <span>{profile?.semester || '-'}</span> Registration
                    </h1>
                    <p className="page-subtitle" style={{ color: 'var(--slate-500)' }}>Manage your course enrollments and view registration status</p>
                </div>
            </div>

            <section className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {/* Enrolled Courses */}
                <div className="card stat-card">
                    <div className="stat-icon">
                        <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                        <p className="stat-label">Enrolled Courses</p>
                        <h3 className="stat-value">{enrolledOrPending.length}</h3>
                    </div>
                </div>

                {/* Credit Hours */}
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>timer</span>
                    </div>
                    <div>
                        <p className="stat-label">Credit Hours</p>
                        <h3 className="stat-value">{totalSelectedCredits}</h3>
                    </div>
                </div>

                {/* Remaining Credits */}
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>pending</span>
                    </div>
                    <div>
                        <p className="stat-label">Credits Remaining</p>
                        <h3 className="stat-value">{creditsRemaining}</h3>
                    </div>
                </div>

                {/* Registration Window */}
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: windowStatus.bg }}>
                        <span className="material-symbols-outlined" style={{ color: windowStatus.color }}>{windowStatus.icon}</span>
                    </div>
                    <div>
                        <p className="stat-label">Registration Window</p>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <h3 className="stat-value" style={{ fontSize: '1rem', margin: 0, color: windowStatus.color }}>
                                    {windowStatus.statusText}
                                </h3>
                                <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', margin: 0, lineHeight: 1.2 }}>
                                    {windowStatus.dateText}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div id="registration-content">
                {renderTable('Recommended Courses (Your Semester & Section)', recommended)}
                {renderTable('Other Department Courses', others)}
            </div>
        </div>
    );
};

export default CourseRegistration;

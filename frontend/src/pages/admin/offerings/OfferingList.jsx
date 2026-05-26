import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './OfferingList.css';

const OfferingList = () => {
    const [offerings, setOfferings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedDepartments, setExpandedDepartments] = useState({});
    const [expandedSemesters, setExpandedSemesters] = useState({}); // Key: "DeptName-Semester"

    // Registration Window Modal State
    const [isRegModalOpen, setIsRegModalOpen] = useState(false);
    const [regWindow, setRegWindow] = useState({ startDate: '', endDate: '' });
    const [currentWindow, setCurrentWindow] = useState(null);

    // Student override state
    const [studentRollNumber, setStudentRollNumber] = useState('');
    const [overrideStatus, setOverrideStatus] = useState({ type: '', message: '' });
    const [isOverrideLoading, setIsOverrideLoading] = useState(false);
    const [overrideStudents, setOverrideStudents] = useState([]);
    const [overrideDuration, setOverrideDuration] = useState(24); // hours

    useEffect(() => {
        fetchOfferings();
    }, []);

    useEffect(() => {
        if (isRegModalOpen) {
            fetchOverrideStudents();
        }
    }, [isRegModalOpen]);

    const fetchOfferings = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/v1/offerings');
            // Handle { success: true, data: [...] } or direct array
            const data = Array.isArray(res.data) ? res.data : (Array.isArray(res.data?.data) ? res.data.data : []);
            setOfferings(data);
        } catch (error) {
            console.error("Failed to fetch offerings", error);
            setOfferings([]); // Ensure array on error
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to remove this course offering?')) return;
        try {
            await axios.delete(`/api/v1/offerings/${id}`);
            fetchOfferings();
        } catch (error) {
            alert('Error deleting offering');
        }
    };


    // Grouping Logic
    const groupedOfferings = (() => {
        const grouped = {};
        if (!Array.isArray(offerings)) return grouped;

        offerings.forEach(offering => {
            if (offering.status !== 'active') return; // Filter out archived/promoted offerings

            const dept = offering.department?.name || offering.departmentName || 'Unknown Department';
            const deptMaxCredits = offering.maxCredits || 18; // From API mapped field
            const sem = offering.semester || 1;

            if (!grouped[dept]) {
                grouped[dept] = {
                    semesters: {},
                    maxCredits: deptMaxCredits,
                    totalCourses: 0
                };
            }
            if (!grouped[dept].semesters[sem]) grouped[dept].semesters[sem] = [];
            grouped[dept].semesters[sem].push(offering);
            grouped[dept].totalCourses++;
        });
        return grouped;
    })();

    const toggleDepartment = (dept) => {
        setExpandedDepartments(prev => ({
            ...prev,
            [dept]: !prev[dept]
        }));
    };

    const toggleSemester = (dept, sem) => {
        const key = `${dept}-${sem}`;
        // Logic to close other semesters in the same department (Accordion behavior from HTML)
        // The HTML said: "Accordion behavior - only one semester open at a time within each department"

        setExpandedSemesters(prev => {
            const newState = { ...prev };
            // Close all semesters for this dept
            Object.keys(newState).forEach(k => {
                if (k.startsWith(`${dept}-`)) {
                    newState[k] = false;
                }
            });
            // Toggle the clicked one (if it was closed, open it. If it was open, it stays closed due to logic above? No, toggle.)
            // Actually, if we want exactly "toggle", we need to check if it was already open.
            const wasOpen = prev[key];
            if (!wasOpen) {
                newState[key] = true;
            }
            return newState;
        });
    };

    // Initialize defaults: Open first department? Or all closed? 
    // HTML didn't specify default open state, usually closed or first open.
    // We'll leave them collapsed by default to match "collapsed" class usage in HTML if any, 
    // but in HTML `collapsed` class was toggled.
    // The HTML has `onclick="this.parentElement.classList.toggle('collapsed')"`
    // And default HTML structure didn't have 'collapsed' class on department-group, so it starts OPEN.

    // Let's set all departments to OPEN by default equal to "not in expandedDepartments means open" or "in means closed".
    // To be cleaner, let's track collapsed state. 
    // HTML: `<div class="department-group">` (Open by default)

    const isDeptCollapsed = (dept) => !expandedDepartments[dept];
    const onDeptHeaderClick = (dept) => {
        setExpandedDepartments(prev => ({ ...prev, [dept]: !prev[dept] }));
    };

    // Semester: `<div class="semester-group sem-collapsed">` -> Starts COLLAPSED.
    const isSemesterOpen = (dept, sem) => !!expandedSemesters[`${dept}-${sem}`];

    // Registration Window Functions
    const openRegistrationWindow = async () => {
        setIsRegModalOpen(true);
        try {
            const res = await axios.get('/api/v1/settings/registration-window');
            if (res.data.success !== false) { // Assuming API returns object direct or {success: true, data: ...}
                const data = res.data.data || res.data;
                if (data.startDate) {
                    const startIndices = data.startDate.indexOf('T') > -1 ? 16 : 16;
                    // formatting for datetime-local: YYYY-MM-DDTHH:mm
                    const format = (d) => new Date(d).toISOString().slice(0, 16);
                    setRegWindow({
                        startDate: format(data.startDate),
                        endDate: format(data.endDate)
                    });
                    setCurrentWindow({
                        start: new Date(data.startDate).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
                        end: new Date(data.endDate).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '')
                    });
                }
            }
        } catch (error) {
            console.error("Failed to load registration window", error);
        }
    };

    const saveRegistrationWindow = async (e) => {
        e.preventDefault();
        if (new Date(regWindow.startDate) >= new Date(regWindow.endDate)) {
            alert('End date must be after start date');
            return;
        }
        try {
            await axios.put('/api/v1/settings/registration-window', regWindow);
            alert('Registration window saved successfully!');
            setIsRegModalOpen(false);
        } catch (error) {
            alert('Failed to save registration window');
        }
    };

    const fetchOverrideStudents = async () => {
        try {
            const res = await axios.get('/api/v1/settings/registration-window/students');
            if (res.data.success) {
                setOverrideStudents(res.data.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch override students:', error);
        }
    };

    const handleOpenStudentRegistration = async () => {
        if (!studentRollNumber.trim()) {
            setOverrideStatus({ type: 'error', message: 'Please enter a roll number' });
            return;
        }

        setIsOverrideLoading(true);
        setOverrideStatus({ type: '', message: '' });

        try {
            const res = await axios.put('/api/v1/settings/registration-window/student', {
                rollNumber: studentRollNumber.trim(),
                durationHours: overrideDuration
            });

            if (res.data.success) {
                setOverrideStatus({
                    type: 'success',
                    message: res.data.message || `Registration opened for ${studentRollNumber}`
                });
                setStudentRollNumber('');
                // Refresh the override students list
                await fetchOverrideStudents();
            }
        } catch (error) {
            setOverrideStatus({
                type: 'error',
                message: error.response?.data?.error || 'Failed to open registration'
            });
        } finally {
            setIsOverrideLoading(false);
        }
    };

    const handleCloseStudentRegistration = async (rollNumber) => {
        try {
            const res = await axios.delete(`/api/v1/settings/registration-window/student/${rollNumber}`);
            if (res.data.success) {
                // Refresh the override students list
                await fetchOverrideStudents();
            }
        } catch (error) {
            console.error('Failed to close registration:', error);
            alert(error.response?.data?.error || 'Failed to close registration');
        }
    };

    return (
        <div className="offering-list-page-container" style={{ padding: '0 1rem 2rem 0' }}> {/* Wrapper for style isolation */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Course Offerings</h1>
                    <p className="page-subtitle">Manage course offerings for current semester</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <button onClick={openRegistrationWindow} className="btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', background: 'var(--slate-700)', color: 'white', borderRadius: '0.75rem', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                        <span className="material-symbols-outlined">calendar_clock</span>
                        Set Registration Window
                    </button>
                    <Link to="/admin/offerings/new" className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.75rem 1.5rem', background: 'var(--primary)', color: 'white', borderRadius: '0.75rem', fontWeight: '600' }}>
                        <span className="material-symbols-outlined">add</span>
                        Offer Course
                    </Link>
                </div>
            </div>

            <div id="offeringsContainer" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>Loading...</div>
                ) : Object.keys(groupedOfferings).length === 0 ? (
                    <div id="emptyState" className="empty-state" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--slate-300)' }}>playlist_add_check</span>
                        <p style={{ marginTop: '1rem', fontSize: '1.25rem', color: 'var(--slate-700)', fontWeight: '600' }}>No offerings found</p>
                        <p style={{ color: 'var(--slate-500)' }}>Offer your first course to get started</p>
                    </div>
                ) : (
                    Object.keys(groupedOfferings).sort().map(dept => {
                        const deptData = groupedOfferings[dept];
                        const isCollapsed = isDeptCollapsed(dept);

                        // Calculate Dept Notifications
                        let deptPendingEnrollments = 0;
                        let deptPendingGrades = 0;
                        Object.values(deptData.semesters).flat().forEach(off => {
                            deptPendingEnrollments += (parseInt(off.pendingCount) || 0);
                            if (off.resultStatus === 'submitted') deptPendingGrades++;
                        });
                        const hasDeptNotification = deptPendingEnrollments > 0 || deptPendingGrades > 0;

                        return (
                            <div key={dept} className={`department-group ${isCollapsed ? 'collapsed' : ''}`}>
                                <div className="department-header" onClick={() => onDeptHeaderClick(dept)}>
                                    <div className="dept-info">
                                        <span className="material-symbols-outlined dept-icon">corporate_fare</span>
                                        <h3 style={{ margin: 0 }}>{dept}</h3>
                                        {hasDeptNotification && (
                                            <span style={{
                                                height: '6.4px',
                                                width: '6.4px',
                                                backgroundColor: '#DC2626',
                                                borderRadius: '50%',
                                                display: 'inline-block',
                                                marginLeft: '0.5rem',
                                                boxShadow: '0 0 0 2px #1e293b'
                                            }}></span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                {deptData.totalCourses} courses offered
                                            </span>
                                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.2)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <span className="material-symbols-outlined" style={{ fontSize: '11.2px' }}>speed</span>
                                                Limit: {deptData.maxCredits} Cr / Sem
                                            </span>
                                        </div>
                                        <span className="material-symbols-outlined expand-icon">expand_more</span>
                                    </div>
                                </div>
                                <div className="department-content-wrapper">
                                    <div className="department-content-inner">
                                        <div className="department-content">
                                            {Object.keys(deptData.semesters).sort((a, b) => parseInt(a) - parseInt(b)).map(sem => {
                                                const semOfferings = deptData.semesters[sem];
                                                const isOpen = isSemesterOpen(dept, sem);

                                                // Calculate Semester Notifications
                                                let semPendingEnrollments = 0;
                                                let semPendingGrades = 0;
                                                semOfferings.forEach(off => {
                                                    semPendingEnrollments += (parseInt(off.pendingCount) || 0);
                                                    if (off.resultStatus === 'submitted') semPendingGrades++;
                                                });
                                                const hasSemNotification = semPendingEnrollments > 0 || semPendingGrades > 0;

                                                // Group by Course Name/Code
                                                const courseGroups = {};
                                                semOfferings.forEach(off => {
                                                    const key = off.course?.code || off.courseCode || off.course?.name || "Unknown";
                                                    if (!courseGroups[key]) {
                                                        courseGroups[key] = {
                                                            ...off,
                                                            courseName: off.course?.name || off.courseName,
                                                            courseCode: off.course?.code || off.courseCode,
                                                            credits: off.course?.credits || off.credits,
                                                            sections: []
                                                        };
                                                    }
                                                    courseGroups[key].sections.push(off);
                                                });

                                                return (
                                                    <div key={sem} className={`semester-group ${!isOpen ? 'sem-collapsed' : ''}`}>
                                                        <div className="semester-header" onClick={() => toggleSemester(dept, sem)}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span className="material-symbols-outlined" style={{ color: '#8B5CF6', fontSize: '1.25rem' }}>school</span>
                                                                <h4 style={{ margin: 0 }}>Semester {sem}</h4>
                                                                {hasSemNotification && (
                                                                    <span style={{
                                                                        height: '6.4px',
                                                                        width: '6.4px',
                                                                        backgroundColor: '#DC2626',
                                                                        borderRadius: '50%',
                                                                        display: 'inline-block'
                                                                    }}></span>
                                                                )}
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <span className="badge" style={{ fontSize: '0.7rem' }}>{Object.keys(courseGroups).length} courses</span>
                                                                <span className="material-symbols-outlined sem-expand-icon">expand_more</span>
                                                            </div>
                                                        </div>
                                                        <div className="semester-content-wrapper">
                                                            <div className="semester-content-inner">
                                                                <div className="semester-content">
                                                                    <div className="courses-grid">
                                                                        {Object.values(courseGroups).map((course, idx) => {
                                                                            const activeSections = course.sections.filter(s => s.status === 'active');
                                                                            if (activeSections.length === 0) return null;

                                                                            const totalEnrolled = activeSections.reduce((sum, s) => sum + (parseInt(s.enrolledCount) || 0), 0);
                                                                            const totalPending = activeSections.reduce((sum, s) => sum + (parseInt(s.pendingCount) || 0), 0);

                                                                            // Check if any section has submitted grades
                                                                            const hasSubmittedGrades = activeSections.some(s => s.resultStatus === 'submitted');

                                                                            const targetSectionId = activeSections.find(s => s.pendingCount > 0)?.id || activeSections[0].id;

                                                                            return (
                                                                                <div key={idx} className="course-card-item" style={{ position: 'relative', border: hasSubmittedGrades ? '1px solid #10B981' : undefined }}>
                                                                                    {hasSubmittedGrades && (
                                                                                        <div style={{
                                                                                            position: 'absolute',
                                                                                            top: '-6px',
                                                                                            right: '-6px',
                                                                                            backgroundColor: '#10B981', // Green for grade submission
                                                                                            color: 'white',
                                                                                            borderRadius: '50%',
                                                                                            width: '14.4px',
                                                                                            height: '14.4px',
                                                                                            fontSize: '8px',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            zIndex: 10,
                                                                                            boxShadow: '0 0 0 2px var(--slate-900)'
                                                                                        }}>
                                                                                            <span className="material-symbols-outlined" style={{ fontSize: '9.6px' }}>check</span>
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="course-header-row">
                                                                                        <h4 className="course-title">{course.courseName}</h4>
                                                                                        <p className="course-code-line">{course.courseCode} • {course.credits || '-'} Cr</p>
                                                                                    </div>
                                                                                    <div className="course-sections-list">
                                                                                        {activeSections.map(sec => (
                                                                                            <div key={sec.id} className="section-row">
                                                                                                <Link to={`/admin/offerings/students?id=${sec.id}`} className={`enrollment-badge ${sec.pendingCount > 0 ? 'pending' : 'enrolled'}`} style={{ marginRight: '0.75rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto', position: 'relative' }}>
                                                                                                    <span className="material-symbols-outlined" style={{ fontSize: '9.6px' }}>group</span>
                                                                                                    <span>{sec.enrolledCount || 0}{sec.pendingCount > 0 ? ` (+${sec.pendingCount})` : ''}</span>
                                                                                                    {sec.pendingCount > 0 && <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '6.4px', height: '6.4px', backgroundColor: '#DC2626', borderRadius: '50%' }}></span>}
                                                                                                </Link>
                                                                                                <span className="meta-value" style={{ minWidth: '56px', fontSize: '0.85rem' }}>{sec.batchName}</span>
                                                                                                <span className="meta-value section-badge">Sec {sec.sectionName}</span>
                                                                                                <div style={{ flex: 1, marginLeft: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                                                                                                    <span className={`teacher-name ${sec.teacherName === 'Unassigned' ? 'unassigned' : ''}`} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                                                                                                        {sec.teacherName}
                                                                                                    </span>
                                                                                                    {sec.resultStatus === 'submitted' && (
                                                                                                        <span className="status-indicator-submitted">
                                                                                                            Grades Submitted
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                                                                    <Link to={`/admin/offerings/${sec.id}/edit`} className="icon-btn-sm" title="Edit">
                                                                                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>edit</span>
                                                                                                    </Link>
                                                                                                    <button onClick={() => handleDelete(sec.id)} className="icon-btn-sm danger" title="Delete">
                                                                                                        <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Registration Window Modal */}
            {isRegModalOpen && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsRegModalOpen(false) }}>
                    <div className="modal-content" style={{ maxWidth: '960px' }}>
                        <div className="modal-header">
                            <h2 className="modal-title">
                                <span className="material-symbols-outlined" style={{ fontSize: '1.75rem', color: '#8B5CF6' }}>calendar_clock</span>
                                Set Registration Window
                            </h2>
                            <button onClick={() => setIsRegModalOpen(false)} className="modal-close-btn">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <p className="modal-body-text">
                            Configure the time period during which students are permitted to add or drop courses for the current semester.
                        </p>

                        {/* Two or Three Column Layout */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: overrideStudents.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr',
                            gap: '2rem'
                        }}>
                            {/* Left Column: Global Registration Window */}
                            <div>
                                <form onSubmit={saveRegistrationWindow}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                                        <div className="modal-form-group">
                                            <label className="modal-label">Start Date & Time</label>
                                            <div className="modal-input-wrapper">
                                                <input type="datetime-local" className="modal-input" required
                                                    value={regWindow.startDate}
                                                    onChange={(e) => setRegWindow({ ...regWindow, startDate: e.target.value })} />
                                                <span className="material-symbols-outlined calendar-icon">calendar_month</span>
                                            </div>
                                        </div>
                                        <div className="modal-form-group">
                                            <label className="modal-label">End Date & Time</label>
                                            <div className="modal-input-wrapper">
                                                <input type="datetime-local" className="modal-input" required
                                                    value={regWindow.endDate}
                                                    onChange={(e) => setRegWindow({ ...regWindow, endDate: e.target.value })} />
                                                <span className="material-symbols-outlined calendar-icon">calendar_month</span>
                                            </div>
                                        </div>
                                    </div>

                                    {currentWindow && (
                                        <div className="current-window-info">
                                            <p className="current-window-text">
                                                <span style={{ fontWeight: '700', color: '#8B5CF6', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Active Window
                                                </span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', color: '#8B5CF6' }}>event</span>
                                                    {currentWindow.start} — {currentWindow.end}
                                                </span>
                                            </p>
                                        </div>
                                    )}

                                    <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                                        <button type="button" onClick={() => setIsRegModalOpen(false)} className="btn-secondary-modal">Cancel</button>
                                        <button type="submit" className="btn-primary-modal">Save Configuration</button>
                                    </div>
                                </form>
                            </div>

                            {/* Middle Column: Student Specific Override */}
                            <div style={{ paddingLeft: '2rem', borderLeft: '1px solid var(--slate-200)', paddingRight: overrideStudents.length > 0 ? '2rem' : '0' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--slate-800)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>person_search</span>
                                    Individual Student Override
                                </h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1.25rem' }}>
                                    Open a custom registration window for a specific student.
                                </p>

                                <div className="modal-form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="modal-label">Duration</label>
                                    <select
                                        className="modal-input"
                                        value={overrideDuration}
                                        onChange={(e) => setOverrideDuration(Number(e.target.value))}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <option value={1}>1 Hour</option>
                                        <option value={2}>2 Hours</option>
                                        <option value={6}>6 Hours</option>
                                        <option value={12}>12 Hours</option>
                                        <option value={24}>24 Hours</option>
                                    </select>
                                </div>

                                <div className="modal-form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="modal-label">Student Roll Number</label>
                                    <input
                                        type="text"
                                        className="modal-input"
                                        placeholder="e.g. BSCS24001"
                                        value={studentRollNumber}
                                        onChange={(e) => setStudentRollNumber(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleOpenStudentRegistration()}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenStudentRegistration}
                                    disabled={isOverrideLoading}
                                    className="btn-primary-modal"
                                    style={{ width: '100%', marginTop: '0.5rem' }}
                                >
                                    {isOverrideLoading ? 'Opening...' : 'Open Registration'}
                                </button>

                                {overrideStatus.message && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '0.5rem',
                                        fontSize: '0.85rem',
                                        backgroundColor: overrideStatus.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        color: overrideStatus.type === 'success' ? '#059669' : '#DC2626',
                                        border: `1px solid ${overrideStatus.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                    }}>
                                        {overrideStatus.message}
                                    </div>
                                )}
                            </div>

                            {/* Right Column: Active Override Students List (conditional) */}
                            {overrideStudents.length > 0 && (
                                <div style={{ paddingLeft: '2rem', borderLeft: '1px solid var(--slate-200)' }}>
                                    <h3 style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--slate-800)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>group</span>
                                        Active Overrides ({overrideStudents.length})
                                    </h3>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--slate-500)', marginBottom: '1rem' }}>
                                        Students with individual registration windows
                                    </p>

                                    <div style={{
                                        maxHeight: '240px',
                                        overflowY: 'auto',
                                        paddingRight: '0.5rem'
                                    }}>
                                        {overrideStudents.map((student) => (
                                            <div
                                                key={student.id}
                                                style={{
                                                    padding: '0.75rem',
                                                    marginBottom: '0.5rem',
                                                    borderRadius: '0.5rem',
                                                    backgroundColor: 'var(--slate-50)',
                                                    border: '1px solid var(--slate-200)',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'var(--slate-800)', marginBottom: '0.25rem' }}>
                                                            {student.user?.firstName} {student.user?.lastName}
                                                        </div>
                                                        <div style={{ color: 'var(--slate-500)', fontSize: '0.8rem' }}>
                                                            {student.rollNumber}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCloseStudentRegistration(student.rollNumber)}
                                                        style={{
                                                            padding: '0.25rem 0.5rem',
                                                            fontSize: '0.7rem',
                                                            borderRadius: '0.375rem',
                                                            border: '1px solid #DC2626',
                                                            backgroundColor: 'transparent',
                                                            color: '#DC2626',
                                                            cursor: 'pointer',
                                                            fontWeight: '500',
                                                            transition: 'all 0.2s'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = '#DC2626';
                                                            e.target.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = 'transparent';
                                                            e.target.style.color = '#DC2626';
                                                        }}
                                                    >
                                                        Close
                                                    </button>
                                                </div>
                                                <div style={{ color: 'var(--slate-600)', fontSize: '0.75rem' }}>
                                                    Until: {new Date(student.registrationEndDate).toLocaleString('en-GB', {
                                                        year: 'numeric',
                                                        month: '2-digit',
                                                        day: '2-digit',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    }).replace(',', '')}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OfferingList;

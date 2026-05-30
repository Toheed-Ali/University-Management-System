import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Skeleton } from 'boneyard-js/react';
import './StudentList.css';
import '../AdminDashboard.css';

const StudentList = () => {
    const [allStudents, setAllStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [expandedSemesters, setExpandedSemesters] = useState({});
    const [canPromote, setCanPromote] = useState(false);
    const [promotionPendingCount, setPromotionPendingCount] = useState(0);

    useEffect(() => {
        loadStudents();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, deptFilter, statusFilter, allStudents]);

    const loadStudents = async () => {
        try {
            // Load departments
            const deptRes = await axios.get('/api/v1/departments');
            setDepartments(deptRes.data.data || []);

            // Load students
            const studentsRes = await axios.get('/api/v1/students');
            const studentsList = studentsRes.data.data || [];
            setAllStudents(studentsList);
            setFilteredStudents(studentsList);

            // Initialize all semesters as expanded
            const semesters = {};
            studentsList.forEach(s => {
                const semester = parseInt(s.semester) || 1;
                semesters[semester] = true;
            });
            setExpandedSemesters(semesters);
        } catch (error) {
            console.error('Failed to load students:', error);
            setAllStudents([]);
            setFilteredStudents([]);
        } finally {
            setLoading(false);
            checkPromotionStatus();
        }
    };

    const checkPromotionStatus = async () => {
        try {
            const res = await axios.get('/api/v1/students/promotion-status');
            if (res.data.success) {
                setCanPromote(res.data.data.canPromote);
                setPromotionPendingCount(res.data.data.pendingCount);
            }
        } catch (err) {
            console.error('Failed to check promotion status:', err);
        }
    };

    const applyFilters = () => {
        let filtered = [...allStudents];

        // Search filter
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            filtered = filtered.filter(student => {
                const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.toLowerCase();
                const email = (student.user?.email || '').toLowerCase();
                const rollNumber = (student.rollNumber || '').toLowerCase();
                return fullName.includes(search) || email.includes(search) || rollNumber.includes(search);
            });
        }

        // Department filter
        if (deptFilter) {
            filtered = filtered.filter(s => s.departmentId == deptFilter);
        }

        // Status filter
        if (statusFilter) {
            filtered = filtered.filter(s => s.user?.status === statusFilter);
        }

        // Separate graduated students from active students
        // Graduated students shown in separate section, not in semester tables
        const activeStudents = statusFilter === 'graduated' ? [] : filtered.filter(s => s.user?.status !== 'graduated');

        setFilteredStudents(activeStudents);
    };

    const getDepartmentName = (departmentId) => {
        if (!departmentId) return 'N/A';
        const dept = departments.find(d => d.id == departmentId);
        return dept ? dept.name : 'N/A';
    };

    const getFilteredGraduatedStudents = () => {
        return allStudents.filter(s => {
            // Must be graduated
            if (s.user?.status !== 'graduated') return false;

            // Apply search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
                const email = (s.user?.email || '').toLowerCase();
                const rollNumber = (s.rollNumber || '').toLowerCase();
                if (!fullName.includes(search) && !email.includes(search) && !rollNumber.includes(search)) {
                    return false;
                }
            }

            // Apply department filter
            if (deptFilter && s.departmentId != deptFilter) {
                return false;
            }

            // Apply status filter (should always pass if status is graduated or no filter)
            if (statusFilter && s.user?.status !== statusFilter) {
                return false;
            }

            return true;
        });
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        try {
            await axios.delete(`/api/v1/students/${id}`);
            await loadStudents();
            alert('Student deleted successfully');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete student');
        }
    };

    const toggleSemester = (semester) => {
        setExpandedSemesters(prev => ({
            ...prev,
            [semester]: !prev[semester]
        }));
    };

    const handleMoveToNextSemester = async () => {
        if (!window.confirm('Are you sure you want to move ALL students to the next semester? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await axios.post('/api/v1/students/promote-semester');
            if (res.data.success) {
                alert(res.data.message);
                // Reload students to reflect changes
                loadStudents();
            }
        } catch (error) {
            console.error('Error promoting students:', error);
            alert(error.response?.data?.error || 'Failed to move students to next semester');
        }
    };

    /*
    const handleMoveToPreviousSemester = async () => {
        if (!window.confirm('Are you sure you want to move ALL students to the previous semester? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await axios.post('/api/v1/students/demote-semester');
            if (res.data.success) {
                alert(res.data.message);
                // Reload students to reflect changes
                loadStudents();
            }
        } catch (error) {
            console.error('Error demoting students:', error);
            alert(error.response?.data?.error || 'Failed to move students to previous semester');
        }
    };
    */

    // Calculate stats
    const totalCount = allStudents.length;
    const activeCount = allStudents.filter(s => s.user?.status === 'active').length;
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const newCount = allStudents.filter(s => new Date(s.createdAt).getTime() > monthAgo).length;
    const cgpaSum = allStudents.reduce((sum, s) => sum + parseFloat(s.cgpa || 0), 0);
    const avgCGPA = totalCount > 0 ? (cgpaSum / totalCount).toFixed(2) : '0.00';

    // Group students by semester
    const semesterMap = {};
    filteredStudents.forEach(student => {
        let semester = parseInt(student.semester) || 1;
        if (!semesterMap[semester]) semesterMap[semester] = [];
        semesterMap[semester].push(student);
    });

    const semesters = Object.keys(semesterMap).sort((a, b) => parseInt(a) - parseInt(b));

    if (loading) {
        return (
            <div className="dashboard-container student-management-page">
                <Skeleton name="student-list" loading={true} animate="shimmer" stagger transition>
                    <div style={{ minHeight: '600px' }} />
                </Skeleton>
            </div>
        );
    }

    return (
        <div className="dashboard-container student-management-page">
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title" style={{ color: 'var(--slate-800)' }}>Students</h1>
                    <p className="page-subtitle" style={{ color: 'var(--slate-500)' }}>Manage student registrations and records</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {/* 
                    <button
                        className="btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                        onClick={handleMoveToPreviousSemester}
                    >
                        <span className="material-symbols-outlined">arrow_downward</span>
                        Move to Previous Semester
                    </button>
                    */}

                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            className={`btn-secondary ${!canPromote ? 'disabled' : ''}`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                opacity: !canPromote ? 0.6 : 1,
                                cursor: !canPromote ? 'not-allowed' : 'pointer'
                            }}
                            onClick={handleMoveToNextSemester}
                            disabled={!canPromote}
                            title={!canPromote ? `${promotionPendingCount} active courses still have pending/unapproved grades.` : 'Promote all students to next semester'}
                        >
                            <span className="material-symbols-outlined">arrow_upward</span>
                            Move to Next Semester
                        </button>
                    </div>
                    <Link to="/admin/students/new" className="btn-primary">
                        <span className="material-symbols-outlined">add</span>
                        Add Student
                    </Link>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                            Search Students
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, roll number, or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #E2E8F0', borderRadius: '0.75rem', fontSize: '0.9375rem' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                            Department
                        </label>
                        <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            style={{ padding: '0.75rem 1rem', border: '2px solid #E2E8F0', borderRadius: '0.75rem', fontSize: '0.9375rem', color: '#1E293B', backgroundColor: 'white' }}
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{ padding: '0.75rem 1rem', border: '2px solid #E2E8F0', borderRadius: '0.75rem', fontSize: '0.9375rem', color: '#1E293B', backgroundColor: 'white' }}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="graduated">Graduated</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Students Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card stat-card">
                    <div className="stat-icon">
                        <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Students</p>
                        <h3 className="stat-value">{totalCount}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>task_alt</span>
                    </div>
                    <div>
                        <p className="stat-label">Active</p>
                        <h3 className="stat-value">{activeCount}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>new_releases</span>
                    </div>
                    <div>
                        <p className="stat-label">New This Month</p>
                        <h3 className="stat-value">{newCount}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#FB923C' }}>workspace_premium</span>
                    </div>
                    <div>
                        <p className="stat-label">Avg CGPA</p>
                        <h3 className="stat-value">{avgCGPA}</h3>
                    </div>
                </div>
            </div>

            {/* Semester Tables */}
            <div id="semesterTablesContainer">
                {semesters.length === 0 && allStudents.filter(s => {
                    // Apply same filters as applyFilters but only for graduated students
                    let match = s.user?.status === 'graduated';

                    if (searchTerm && match) {
                        const search = searchTerm.toLowerCase();
                        const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.toLowerCase();
                        const email = (s.user?.email || '').toLowerCase();
                        const rollNumber = (s.rollNumber || '').toLowerCase();
                        match = fullName.includes(search) || email.includes(search) || rollNumber.includes(search);
                    }

                    if (deptFilter && match) {
                        match = s.departmentId == deptFilter;
                    }

                    if (statusFilter && match) {
                        match = s.user?.status === statusFilter;
                    }

                    return match;
                }).length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--slate-300)' }}>school</span>
                        <h3>No Students Found</h3>
                        <p>Add your first student to get started</p>
                        <Link to="/admin/students/new" className="btn-primary" style={{ marginTop: '1rem' }}>
                            Add Student
                        </Link>
                    </div>
                ) : (
                    semesters.map(semester => {
                        const students = semesterMap[semester];
                        const sortedStudents = [...students].sort((a, b) =>
                            (a.rollNumber || '').localeCompare(b.rollNumber || '')
                        );
                        const isExpanded = expandedSemesters[semester];

                        return (
                            <div key={semester} className="semester-card card" style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
                                <div
                                    className={`semester-header ${!isExpanded ? 'collapsed' : ''}`}
                                    onClick={() => toggleSemester(semester)}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '1rem 1.5rem',
                                        cursor: 'pointer',
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{
                                            width: '2.5rem',
                                            height: '2.5rem',
                                            background: 'linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%)',
                                            borderRadius: '0.625rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 700
                                        }}>
                                            {semester}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>
                                                Semester {semester}
                                            </h3>
                                            <p style={{ fontSize: '0.875rem', color: 'var(--slate-500)', margin: 0 }}>
                                                {sortedStudents.length} student{sortedStudents.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button className="expand-btn" style={{ background: 'none', border: 'none', padding: '0.25rem', cursor: 'pointer', color: 'var(--slate-400)' }}>
                                        <span className="material-symbols-outlined">
                                            {isExpanded ? 'expand_more' : 'chevron_right'}
                                        </span>
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="semester-content">
                                        <div className="table-container">
                                            <table className="data-table">
                                                <thead>
                                                    <tr>
                                                        <th>Roll Number</th>
                                                        <th>Name</th>
                                                        <th>Department</th>
                                                        <th>Batch</th>
                                                        <th>CGPA</th>
                                                        <th>Status</th>
                                                        <th>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sortedStudents.map(student => {
                                                        const firstName = student.user?.firstName || '';
                                                        const lastName = student.user?.lastName || '';
                                                        const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
                                                        const initials = (firstName && lastName)
                                                            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                                                            : fullName.substring(0, 2).toUpperCase();
                                                        const email = student.user?.email || 'N/A';
                                                        const rollNumber = student.rollNumber || 'N/A';
                                                        const department = getDepartmentName(student.departmentId);
                                                        const batch = student.batch ? student.batch.name : 'N/A';
                                                        const section = student.section ? student.section.name : 'N/A';
                                                        const cgpa = student.cgpa ? parseFloat(student.cgpa).toFixed(2) : '0.00';
                                                        const status = student.user?.status || 'active';

                                                        return (
                                                            <tr key={student.id}>
                                                                <td><strong>{rollNumber}</strong></td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                                        <div style={{
                                                                            width: '2.5rem',
                                                                            height: '2.5rem',
                                                                            borderRadius: '0.5rem',
                                                                            background: '#8B5CF6',
                                                                            color: 'white',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            fontWeight: 700,
                                                                            fontSize: '0.875rem'
                                                                        }}>
                                                                            {initials}
                                                                        </div>
                                                                        <div>
                                                                            <div style={{ fontWeight: 600 }}>{fullName}</div>
                                                                            <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>{email}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>{department}</td>
                                                                <td>{batch}</td>
                                                                <td><strong>{cgpa}</strong></td>
                                                                <td><span className={`status-badge status-${status}`}>{status}</span></td>
                                                                <td>
                                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                        <Link to={`/admin/students/${student.id}`} className="icon-btn" title="View">
                                                                            <span className="material-symbols-outlined">visibility</span>
                                                                        </Link>
                                                                        <Link to={`/admin/students/${student.id}/edit`} className="icon-btn" title="Edit">
                                                                            <span className="material-symbols-outlined">edit</span>
                                                                        </Link>
                                                                        <button onClick={() => handleDelete(student.id)} className="icon-btn danger" title="Delete">
                                                                            <span className="material-symbols-outlined">delete</span>
                                                                        </button>
                                                                    </div>
                                                                </td>
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
                    })
                )}

                {/* Graduated Students Section */}
                {getFilteredGraduatedStudents().length > 0 && (
                    <div className="card" style={{ marginTop: '2rem', border: '2px solid #10B981', padding: 0, overflow: 'hidden' }}>
                        <div
                            className="semester-header"
                            style={{
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                                color: 'white',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'default'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '1.5rem' }}>
                                    school
                                </span>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>
                                        Graduated Students
                                    </div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                        {getFilteredGraduatedStudents().length} students
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Roll Number</th>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Batch</th>
                                        <th>CGPA</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getFilteredGraduatedStudents()
                                        .map(student => {
                                            const fullName = `${student.user?.firstName || ''} ${student.user?.lastName || ''}`.trim();
                                            const department = getDepartmentName(student.departmentId);
                                            const email = student.user?.email || '';
                                            const rollNumber = student.rollNumber || 'N/A';
                                            const batch = student.batch ? student.batch.name : 'N/A';
                                            const cgpa = student.cgpa || '0.00';
                                            const status = student.user?.status || 'N/A';
                                            const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                                            return (
                                                <tr key={student.id}>
                                                    <td><strong>{rollNumber}</strong></td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '2.5rem',
                                                                height: '2.5rem',
                                                                borderRadius: '0.5rem',
                                                                background: '#10B981',
                                                                color: 'white',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontWeight: 700,
                                                                fontSize: '0.875rem'
                                                            }}>
                                                                {initials}
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>{fullName}</div>
                                                                <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>{email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>{department}</td>
                                                    <td>{batch}</td>
                                                    <td><strong>{cgpa}</strong></td>
                                                    <td><span className={`status-badge status-${status}`}>{status}</span></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <Link to={`/admin/students/${student.id}`} className="icon-btn" title="View">
                                                                <span className="material-symbols-outlined">visibility</span>
                                                            </Link>
                                                            <Link to={`/admin/students/${student.id}/edit`} className="icon-btn" title="Edit">
                                                                <span className="material-symbols-outlined">edit</span>
                                                            </Link>
                                                            <button onClick={() => handleDelete(student.id)} className="icon-btn danger" title="Delete">
                                                                <span className="material-symbols-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};

export default StudentList;

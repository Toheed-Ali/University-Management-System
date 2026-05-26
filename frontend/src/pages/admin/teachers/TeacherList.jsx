import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './TeacherList.css';

const TeacherList = () => {
    const [teachers, setTeachers] = useState([]);
    const [filteredTeachers, setFilteredTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    useEffect(() => {
        loadTeachers();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [searchTerm, statusFilter, teachers]);

    const loadTeachers = async () => {
        try {
            const res = await axios.get('/api/v1/teachers');
            const data = res.data.data || [];
            // Map to expected structure if needed, or use directly if backend returns consistent data
            // Provided HTML assumed: teacher.profile.firstName, teacher.courses, etc.
            // Our React state: teacher.user.firstName, etc.
            // We'll normalize the data to match the UI expectations or update UI to match data.
            // Let's normalize it to a clean structure for the text
            const normalizedTeachers = data.map(t => ({
                id: t.id,
                userId: t.user?.id,
                email: t.user?.email,
                status: t.user?.status,
                firstName: t.user?.firstName,
                lastName: t.user?.lastName,
                fullName: `${t.user?.firstName} ${t.user?.lastName}`,
                courses: t.courses || []
            }));
            setTeachers(normalizedTeachers);
            setFilteredTeachers(normalizedTeachers);
        } catch (error) {
            console.error("Failed to fetch teachers", error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = teachers;

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(t =>
                t.fullName.toLowerCase().includes(lowerSearch) ||
                t.email.toLowerCase().includes(lowerSearch)
            );
        }

        if (statusFilter) {
            result = result.filter(t => t.status === statusFilter);
        }

        setFilteredTeachers(result);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this teacher?')) return;
        try {
            await axios.delete(`/api/v1/teachers/${id}`);
            loadTeachers();
            alert('Teacher deleted successfully');
        } catch (error) {
            console.error("Delete error", error);
            alert('Failed to delete teacher');
        }
    };

    // Stats
    const totalTeachers = teachers.length;
    const activeTeachers = teachers.filter(t => t.status === 'active').length;

    return (
        <div className="dashboard-container teacher-management-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title" style={{ color: 'var(--slate-800)' }}>Teachers</h1>
                    <p className="page-subtitle" style={{ color: 'var(--slate-500)' }}>Manage faculty and instructors</p>
                </div>
                <Link to="/admin/teachers/new" className="btn-primary">
                    <span className="material-symbols-outlined">add</span>
                    Add Teacher
                </Link>
            </div>

            {/* Filters & Search */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                            Search Teachers
                        </label>
                        <input
                            type="text"
                            placeholder="Search by name, employee ID, or email..."
                            value={searchTerm}
                            className="form-input"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--slate-700)' }}>
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="form-input"
                            style={{ minWidth: '120px' }}
                        >
                            <option value="">All Status</option>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>person</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Teachers</p>
                        <h3 className="stat-value">{totalTeachers}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>task_alt</span>
                    </div>
                    <div>
                        <p className="stat-label">Active</p>
                        <h3 className="stat-value">{activeTeachers}</h3>
                    </div>
                </div>
            </div>

            <div className="card table-card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Assigned Courses</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="teachersTable">
                            {filteredTeachers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                                        <div className="empty-state">
                                            <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--slate-300)' }}>person</span>
                                            <h3>No Teachers Found</h3>
                                            <p>Add your first teacher to get started</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredTeachers.map(teacher => {
                                    const initials = (teacher.firstName?.[0] || '') + (teacher.lastName?.[0] || '');
                                    return (
                                        <tr key={teacher.id}>
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
                                                        {initials || '??'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{teacher.fullName}</div>
                                                        <div style={{ fontSize: '0.8125rem', color: 'var(--slate-500)' }}>{teacher.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{teacher.email}</td>
                                            <td>
                                                {teacher.courses && teacher.courses.length > 0 ? (
                                                    <select className="course-dropdown" defaultValue="summary">
                                                        <option value="summary" disabled>{teacher.courses.length} Course{teacher.courses.length > 1 ? 's' : ''}</option>
                                                        {teacher.courses.map(c => (
                                                            <option key={c.id} disabled>{c.code} - {c.name}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span style={{ color: 'var(--slate-400)', fontStyle: 'italic', fontSize: '0.875rem' }}>No courses</span>
                                                )}
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${teacher.status}`}>
                                                    {teacher.status}
                                                </span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <Link to={`/admin/teachers/${teacher.id}`} className="icon-btn" title="View">
                                                        <span className="material-symbols-outlined">visibility</span>
                                                    </Link>
                                                    <Link to={`/admin/teachers/${teacher.id}/edit`} className="icon-btn" title="Edit">
                                                        <span className="material-symbols-outlined">edit</span>
                                                    </Link>
                                                    <button onClick={() => handleDelete(teacher.id)} className="icon-btn danger" title="Delete">
                                                        <span className="material-symbols-outlined">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TeacherList;

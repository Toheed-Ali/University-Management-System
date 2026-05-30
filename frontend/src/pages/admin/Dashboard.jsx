import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import '../../pages/admin/AdminDashboard.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        students: { total: 0, active: 0, recent: 0 },
        teachers: { total: 0, active: 0, recent: 0 },
        departments: { total: 0 },
        courses: { total: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/v1/dashboard/stats');
            if (res.data.success) {
                setStats(res.data.data);
            }
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get today's date in a friendly format if needed, 
    // though the legacy design just says "Here's what's happening..."

    return (
        <div className="dashboard-container">
            {/* Welcome Section */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome back, <span>Admin</span>!</h1>
                    <p className="page-subtitle">Here's what's happening in your university today</p>
                </div>
            </div>

            {/* Stats Grid */}
            <section className="stats-grid" id="statsGrid">
                <div className="card stat-card">
                    <div className="stat-icon">
                        <span className="material-symbols-outlined">school</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Students</p>
                        <h3 className="stat-value">{stats.students?.total || 0}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>person</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Teachers</p>
                        <h3 className="stat-value">{stats.teachers?.total || 0}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>book</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Courses</p>
                        <h3 className="stat-value">{stats.courses?.total || 0}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#FB923C' }}>corporate_fare</span>
                    </div>
                    <div>
                        <p className="stat-label">Departments</p>
                        <h3 className="stat-value">{stats.departments?.total || 0}</h3>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className="main-grid">
                {/* Quick Actions & Management */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">bolt</span>
                            Quick Actions
                        </h2>
                    </div>

                    <div className="quick-actions-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                        <Link to="/admin/students/new" className="action-card">
                            <div className="action-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>person_add</span>
                            </div>
                            <h3>Add Student</h3>
                            <p>Add new student</p>
                        </Link>

                        <Link to="/admin/teachers/new" className="action-card">
                            <div className="action-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>co_present</span>
                            </div>
                            <h3>Add Teacher</h3>
                            <p>Add faculty member</p>
                        </Link>

                        <Link to="/admin/courses/new" className="action-card">
                            <div className="action-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>library_add</span>
                            </div>
                            <h3>Create Course</h3>
                            <p>Add new course</p>
                        </Link>

                        <Link to="/admin/departments/new" className="action-card">
                            <div className="action-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#FB923C' }}>domain_add</span>
                            </div>
                            <h3>Add Department</h3>
                            <p>Add new department</p>
                        </Link>
                    </div>
                </div>

                {/* Overview Cards */}
                <div>
                    {/* Student Overview */}
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">school</span>
                            Student Overview
                        </h2>
                        <Link to="/admin/students" className="view-all-link">View All</Link>
                    </div>

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                                        {stats.students?.total || 0}
                                    </h3>
                                    <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Total Students</p>
                                </div>
                                <div style={{ width: '4rem', height: '4rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#8B5CF6' }}>school</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.25rem' }}>Active</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-800)' }} className="text-gray-900 dark:text-white">
                                        {stats.students?.active || 0}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.25rem' }}>New This Week</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#22C55E' }}>
                                        {stats.students?.recent || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Teacher Overview */}
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">person</span>
                            Faculty Overview
                        </h2>
                        <Link to="/admin/teachers" className="view-all-link">View All</Link>
                    </div>

                    <div className="card">
                        <div style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--slate-800)' }}>
                                        {stats.teachers?.total || 0}
                                    </h3>
                                    <p style={{ color: 'var(--slate-500)', fontSize: '0.875rem' }}>Total Teachers</p>
                                </div>
                                <div style={{ width: '4rem', height: '4rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '2rem', color: '#22C55E' }}>person</span>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.25rem' }}>Active</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--slate-800)' }} className="text-gray-900 dark:text-white">
                                        {stats.teachers?.active || 0}
                                    </p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginBottom: '0.25rem' }}>Departments</p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, color: '#3B82F6' }}>
                                        {stats.departments?.total || 0}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;


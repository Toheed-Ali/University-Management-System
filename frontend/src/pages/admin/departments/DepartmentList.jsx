import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './DepartmentList.css';

const DepartmentList = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/v1/departments');
            setDepartments(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this department?')) return;
        try {
            await axios.delete(`/api/v1/departments/${id}`);
            setDepartments(departments.filter(d => d.id !== id));
            alert('Department deleted successfully');
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete department');
        }
    };

    // Calculate stats
    const totalCount = departments.length;
    const activeCount = departments.filter(d => d.status === "active").length;
    const withHeadCount = departments.filter(d => !!(d.head || d.headOfDepartment)).length;

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading departments...</div>;

    return (
        <div className="department-list-page">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Departments</h1>
                    <p className="page-subtitle">Manage university departments and faculty</p>
                </div>
                <Link to="/admin/departments/new" className="btn-primary">
                    <span className="material-symbols-outlined">add</span>
                    Add Department
                </Link>
            </div>

            {/* Stats */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>corporate_fare</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Departments</p>
                        <h3 className="stat-value">{totalCount}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>task_alt</span>
                    </div>
                    <div>
                        <p className="stat-label">Active</p>
                        <h3 className="stat-value">{activeCount}</h3>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>badge</span>
                    </div>
                    <div>
                        <p className="stat-label">With Department Head</p>
                        <h3 className="stat-value">{withHeadCount}</h3>
                    </div>
                </div>
            </div>

            {/* Departments Grid */}
            {departments.length === 0 ? (
                <div className="empty-state">
                    <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--slate-300)' }}>corporate_fare</span>
                    <h3>No Departments Found</h3>
                    <p>Create your first department to get started</p>
                    <Link to="/admin/departments/new" className="btn-primary" style={{ marginTop: '1rem' }}>
                        Add Department
                    </Link>
                </div>
            ) : (
                <div className="departments-grid">
                    {departments.map(dept => (
                        <div key={dept.id} className="department-card">
                            <div className="department-header">
                                <div className="department-icon">
                                    <span className="material-symbols-outlined">corporate_fare</span>
                                </div>
                                <span className={`status-badge status-${dept.status}`}>{dept.status || 'Active'}</span>
                            </div>
                            <h3 className="department-name">{dept.name}</h3>
                            <div className="department-code">{dept.code}</div>

                            <div className="department-info">
                                {/* Only render if building exists */}
                                {dept.building && (
                                    <div className="info-item">
                                        <span className="material-symbols-outlined">location_on</span>
                                        <span>{dept.building}{dept.roomNumber ? `, Room ${dept.roomNumber}` : ''}</span>
                                    </div>
                                )}
                                {dept.contactEmail && (
                                    <div className="info-item">
                                        <span className="material-symbols-outlined">email</span>
                                        <span>{dept.contactEmail}</span>
                                    </div>
                                )}
                                {dept.contactPhone && (
                                    <div className="info-item">
                                        <span className="material-symbols-outlined">phone</span>
                                        <span>{dept.contactPhone}</span>
                                    </div>
                                )}
                                {/* If no contact info, maybe show Head of Dept or total credits? 
                                    HTML didn't show it but we have the data. 
                                    Let's stick to the HTML structure exactly. 
                                */}
                            </div>
                            <div className="department-actions">
                                <Link to={`/admin/departments/${dept.id}`} className="btn-view-details" style={{ textAlign: 'center' }}>
                                    View Details
                                </Link>
                                <Link to={`/admin/departments/${dept.id}/edit`} className="icon-btn" title="Edit">
                                    <span className="material-symbols-outlined">edit</span>
                                </Link>
                                <button onClick={() => handleDelete(dept.id)} className="icon-btn danger" title="Delete">
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DepartmentList;

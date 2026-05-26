import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './DepartmentList.css';

const DepartmentEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [teachers, setTeachers] = useState([]);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        degreeTitle: '',
        totalCreditHours: 0,
        maxCreditsPerSemester: 18,
        status: 'active',
        headOfDepartment: ''
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [deptRes, teachersRes] = await Promise.all([
                    axios.get(`/api/v1/departments/${id}`),
                    axios.get('/api/v1/teachers')
                ]);

                const department = deptRes.data.data || deptRes.data;
                const teachersData = teachersRes.data.data || teachersRes.data || [];

                setFormData({
                    name: department.name || '',
                    code: department.code || '',
                    degreeTitle: department.degreeTitle || '',
                    totalCreditHours: department.totalCreditHours || 0,
                    maxCreditsPerSemester: department.maxCreditsPerSemester || 18,
                    status: department.status || 'active',
                    headOfDepartment: department.headOfDepartment || (department.head?.id) || ''
                });

                setTeachers(teachersData);
            } catch (err) {
                console.error('Failed to fetch data:', err);
                showAlert('Failed to load department details', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, [id]);

    const showAlert = (message, type = 'error') => {
        setAlert({ show: true, message, type });
        if (type === 'success') {
            setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'totalCreditHours' || name === 'maxCreditsPerSemester'
                ? parseInt(value) || 0
                : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const dataToSubmit = {
                ...formData,
                code: formData.code.toUpperCase(),
                headOfDepartment: formData.headOfDepartment || null
            };

            const response = await axios.put(`/api/v1/departments/${id}`, dataToSubmit);

            if (response.data.success || response.status === 200) {
                showAlert('Department updated successfully!', 'success');
                setTimeout(() => {
                    navigate('/admin/departments');
                }, 1500);
            } else {
                showAlert(response.data.error || 'Failed to update department', 'error');
            }
        } catch (err) {
            console.error('Update error:', err);
            showAlert(err.response?.data?.error || 'Failed to update department', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading department details...</div>;

    return (
        <div className="dashboard-container department-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/departments" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Edit Department</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Update department information</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {alert.show && (
                    <div className={`alert alert-${alert.type} show`}>
                        <span className="material-symbols-outlined">
                            {alert.type === 'success' ? 'check_circle' : 'error'}
                        </span>
                        {alert.message}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="department-form-section-title">Basic Information</h3>

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label className="form-label">Department Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="dept-input-field"
                                    placeholder="e.g., Computer Science"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department Code *</label>
                                <input
                                    type="text"
                                    name="code"
                                    className="dept-input-field"
                                    placeholder="e.g., CS"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Degree Title *</label>
                                <input
                                    type="text"
                                    name="degreeTitle"
                                    className="dept-input-field"
                                    placeholder="e.g., Bachelor of Science in Computer Science"
                                    value={formData.degreeTitle}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Total Credit Hours *</label>
                                <input
                                    type="number"
                                    name="totalCreditHours"
                                    className="dept-input-field"
                                    placeholder="e.g., 136"
                                    min="0"
                                    value={formData.totalCreditHours}
                                    onChange={handleChange}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                                    Total credit hours required for degrees in this department
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Max Credits Per Semester *</label>
                                <input
                                    type="number"
                                    name="maxCreditsPerSemester"
                                    className="dept-input-field"
                                    placeholder="e.g., 18"
                                    min="1"
                                    max="30"
                                    value={formData.maxCreditsPerSemester}
                                    onChange={handleChange}
                                    required
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                                    Maximum credit hours a student can enroll in per semester
                                </span>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    name="status"
                                    className="dept-input-field"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Head of Department</label>
                                <select
                                    name="headOfDepartment"
                                    className="dept-input-field"
                                    value={formData.headOfDepartment}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Head of Department</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher.userId} value={teacher.userId}>
                                            {teacher.user?.firstName} {teacher.user?.lastName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Link to="/admin/departments" className="btn-cancel-custom">
                            Cancel
                        </Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitting}>
                            {submitting ? 'Updating Department...' : 'Update Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentEdit;

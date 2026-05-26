import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './DepartmentList.css';

const DepartmentForm = () => {
    const navigate = useNavigate();

    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [teachers, setTeachers] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        degreeTitle: '',
        totalCreditHours: '',
        maxCreditsPerSemester: 18,
        status: 'active',
        headOfDepartment: ''
    });

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        try {
            const res = await axios.get('/api/v1/teachers');
            setTeachers(res.data.data || []);
        } catch (err) {
            console.error("Failed to fetch teachers:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitLoading(true);

        try {
            const payload = {
                ...formData,
                totalCreditHours: parseInt(formData.totalCreditHours) || 0,
                maxCreditsPerSemester: parseInt(formData.maxCreditsPerSemester) || 18,
                headOfDepartment: formData.headOfDepartment || null
            };

            await axios.post('/api/v1/departments', payload);
            setSuccess('Department created successfully!');

            setTimeout(() => navigate('/admin/departments'), 1500);
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.error || 'Operation failed');
            setSubmitLoading(false);
        }
    };

    return (
        <div className="dashboard-container department-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/departments" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
                            Add New Department
                        </h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>
                            Create a new department in your university
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && <div className="alert alert-error show"><span className="material-symbols-outlined">error</span>{error}</div>}
                {success && <div className="alert alert-success show"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Basic Information */}
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

                    {/* Form Actions */}
                    <div className="form-actions">
                        <Link to="/admin/departments" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitLoading}>
                            {submitLoading ? 'Creating...' : 'Create Department'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DepartmentForm;

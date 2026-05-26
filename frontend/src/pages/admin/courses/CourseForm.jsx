import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './CourseList.css';

const CourseForm = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [departments, setDepartments] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '',
        credits: 3
    });

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/v1/departments');
            setDepartments(res.data.data || res.data || []);
        } catch (error) {
            console.error("Failed to fetch departments", error);
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
                code: formData.code.toUpperCase(),
                credits: parseInt(formData.credits) || 0,
                maxStudents: 50
            };

            await axios.post('/api/v1/courses', payload);
            setSuccess('Course created successfully!');
            setTimeout(() => navigate('/admin/courses'), 1500);
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.error || 'Operation failed');
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div className="dashboard-container course-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/courses" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Add New Course</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Create a new course in the curriculum</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && <div className="alert alert-error show"><span className="material-symbols-outlined">error</span>{error}</div>}
                {success && <div className="alert alert-success show"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="course-form-section-title">Course Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Course Code *</label>
                                <input
                                    type="text"
                                    name="code"
                                    className="course-input-field"
                                    placeholder="e.g., CS101"
                                    value={formData.code}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Course Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    className="course-input-field"
                                    placeholder="e.g., Introduction to Programming"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select
                                    name="departmentId"
                                    className="course-input-field"
                                    value={formData.departmentId}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} ({dept.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Credits *</label>
                                <input
                                    type="number"
                                    name="credits"
                                    className="course-input-field"
                                    value={formData.credits}
                                    onChange={handleChange}
                                    min="1"
                                    max="6"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Link to="/admin/courses" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitLoading}>
                            {submitLoading ? 'Creating...' : 'Create Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CourseForm;

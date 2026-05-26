import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './CourseList.css';

const CourseEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [departments, setDepartments] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '',
        credits: 3,
        status: 'active'
    });

    useEffect(() => {
        const initData = async () => {
            try {
                await Promise.all([fetchDepartments(), fetchCourse()]);
            } catch (err) {
                console.error("Init Error:", err);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [id]);

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/api/v1/departments');
            setDepartments(res.data.data || res.data || []);
        } catch (error) {
            console.error("Failed to fetch departments", error);
        }
    };

    const fetchCourse = async () => {
        try {
            const res = await axios.get(`/api/v1/courses/${id}`);
            const course = res.data.data || res.data;
            if (course) {
                setFormData({
                    name: course.name || '',
                    code: course.code || '',
                    departmentId: course.departmentId || course.department?.id || '',
                    credits: course.credits || 3,
                    status: course.status || 'active'
                });
            }
        } catch (error) {
            console.error("Failed to fetch course details", error);
            setError('Failed to load course details');
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
                updatedAt: Date.now()
            };

            const response = await axios.put(`/api/v1/courses/${id}`, payload);
            if (response.status === 200 || response.data.success) {
                setSuccess('Course updated successfully!');
                setTimeout(() => navigate('/admin/courses'), 1500);
            } else {
                throw new Error(response.data.error || 'Failed to update course');
            }
        } catch (err) {
            console.error('Update error:', err);
            setError(err.response?.data?.error || err.message || 'Operation failed');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container course-management-page">
                <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--slate-500)' }}>
                    Loading course data...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container course-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/courses" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Edit Course</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Update course information</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && <div className="alert alert-error show"><span className="material-symbols-outlined">error</span>{error}</div>}
                {success && <div className="alert alert-success show"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Course Information Section */}
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

                    {/* Account Status Section */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="course-form-section-title">Account Status</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    name="status"
                                    className="course-input-field"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="form-actions">
                        <Link to="/admin/courses" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitLoading}>
                            {submitLoading ? 'Updating...' : 'Update Course'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CourseEdit;

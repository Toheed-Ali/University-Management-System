import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './TeacherList.css';

const TeacherEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        cnic: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        religion: '',
        employeeId: '',
        email: '',
        employmentType: 'permanent',
        status: 'active'
    });

    // Helper State
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchTeacher = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/v1/teachers/${id}`);
                const teacher = res.data.data;

                if (teacher) {
                    const formattedDOB = teacher.dateOfBirth ? teacher.dateOfBirth.split('T')[0] : '';

                    setFormData({
                        firstName: teacher.user?.firstName || '',
                        lastName: teacher.user?.lastName || '',
                        cnic: teacher.cnic || '',
                        phone: teacher.phone || '',
                        dateOfBirth: formattedDOB,
                        gender: teacher.gender || '',
                        nationality: teacher.nationality || '',
                        religion: teacher.religion || '',
                        employeeId: teacher.employeeId || '',
                        email: teacher.user?.email || '',
                        employmentType: teacher.employmentType || 'permanent',
                        status: teacher.user?.status || 'active'
                    });
                }
            } catch (err) {
                console.error('Fetch teacher error:', err);
                setError('Failed to fetch teacher details');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchTeacher();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                user: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    status: formData.status
                },
                teacher: {
                    phone: formData.phone,
                    cnic: formData.cnic,
                    dateOfBirth: formData.dateOfBirth,
                    gender: formData.gender,
                    nationality: formData.nationality,
                    religion: formData.religion,
                    employmentType: formData.employmentType,
                    employeeId: formData.employeeId || null
                }
            };

            await axios.put(`/api/v1/teachers/${id}`, payload);
            setSuccess('Teacher updated successfully!');
            setTimeout(() => navigate('/admin/teachers'), 1500);
        } catch (err) {
            console.error('Update error:', err);
            setError(err.response?.data?.error || 'Failed to update teacher');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="teacher-management-page">
                <div style={{ display: 'flex', alignItems: 'center', justifyCenter: 'center', minHeight: '320px' }}>
                    <div className="loading-spinner">Loading teacher details...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container teacher-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/teachers" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Edit Teacher</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Update teacher information</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && <div className="alert alert-error show"><span className="material-symbols-outlined">error</span>{error}</div>}
                {success && <div className="alert alert-success show"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Personal Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input
                                    type="text"
                                    name="firstName"
                                    className="form-input"
                                    value={formData.firstName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input
                                    type="text"
                                    name="lastName"
                                    className="form-input"
                                    value={formData.lastName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CNIC Number *</label>
                                <input
                                    type="text"
                                    name="cnic"
                                    className="form-input"
                                    placeholder="xxxxx-xxxxxxx-x"
                                    value={formData.cnic}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input
                                    type="tel"
                                    name="phone"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input
                                    type="date"
                                    name="dateOfBirth"
                                    className="form-input"
                                    value={formData.dateOfBirth}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select
                                    name="gender"
                                    className="form-input"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="" disabled>Select Gender</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nationality *</label>
                                <input
                                    type="text"
                                    name="nationality"
                                    className="form-input"
                                    value={formData.nationality}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Religion *</label>
                                <select
                                    name="religion"
                                    className="form-input"
                                    value={formData.religion}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="">Select Religion</option>
                                    <option value="Islam">Islam</option>
                                    <option value="Christianity">Christianity</option>
                                    <option value="Hinduism">Hinduism</option>
                                    <option value="Buddhism">Buddhism</option>
                                    <option value="Sikhism">Sikhism</option>
                                    <option value="Judaism">Judaism</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Academic Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Teacher ID</label>
                                <input
                                    type="text"
                                    name="employeeId"
                                    className="form-input"
                                    placeholder="e.g. T-12345"
                                    value={formData.employeeId}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    name="email"
                                    className="form-input"
                                    value={formData.email}
                                    disabled
                                    style={{ cursor: 'not-allowed' }}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                                    Email cannot be changed
                                </span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Faculty Type *</label>
                                <select
                                    name="employmentType"
                                    className="form-input"
                                    value={formData.employmentType}
                                    onChange={handleChange}
                                    required
                                >
                                    <option value="permanent">Permanent</option>
                                    <option value="visiting">Visiting</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Account Status */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Account Status</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Status</label>
                                <select
                                    name="status"
                                    className="form-input"
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <Link to="/admin/teachers" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitLoading}>
                            {submitLoading ? 'Updating...' : 'Update Teacher'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeacherEdit;

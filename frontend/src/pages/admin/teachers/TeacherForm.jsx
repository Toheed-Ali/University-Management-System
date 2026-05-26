import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './TeacherList.css';

const TeacherForm = () => {
    const navigate = useNavigate();

    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        employeeId: '',
        phone: '',
        cnic: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        religion: '',
        employmentType: 'permanent',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setSubmitLoading(true);
        try {
            const payload = {
                user: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    password: formData.password,
                    status: 'active'
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

            await axios.post('/api/v1/teachers', payload);
            setSuccess('Teacher added successfully!');

            setTimeout(() => navigate('/admin/teachers'), 1500);
        } catch (err) {
            console.error('Submit error:', err);
            setError(err.response?.data?.error || 'Operation failed');
            setSubmitLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    return (
        <div className="dashboard-container teacher-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/teachers" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>
                            Add New Teacher
                        </h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>
                            Add a new teacher to the university
                        </p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && <div className="alert alert-error show"><span className="material-symbols-outlined">error</span>{error}</div>}
                {success && <div className="alert alert-success show"><span className="material-symbols-outlined">check_circle</span>{success}</div>}

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="teacher-form-section-title">Personal Information</h3>
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
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Academic Info */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="teacher-form-section-title">Academic Info</h3>
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
                                    onChange={handleChange}
                                    required
                                />
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

                    {/* Account Setup */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="teacher-form-section-title">Account Setup</h3>
                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label className="form-label">Password *</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={passwordVisible ? "text" : "password"}
                                        name="password"
                                        className="form-input"
                                        value={formData.password}
                                        onChange={handleChange}
                                        required
                                    />
                                    <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                        <span className="material-symbols-outlined">{passwordVisible ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="form-group full-width">
                                <label className="form-label">Confirm Password *</label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    className="form-input"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <Link to="/admin/teachers" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitLoading}>
                            {submitLoading ? 'Processing...' : 'Add Teacher'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TeacherForm;

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './StudentList.css';

const StudentForm = () => {
    const navigate = useNavigate();
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        fatherName: '',
        cnic: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        nationality: '',
        religion: '',
        rollNumber: '',
        department: '',
        batch: '',
        section: '',
        batchId: '',
        sectionId: '',
        semester: '1',
        password: '',
        confirmPassword: '',
        status: 'active'
    });

    const [passwordVisible, setPasswordVisible] = useState(false);

    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const response = await axios.get('/api/v1/departments');
                setDepartments(response.data.data || response.data || []);
            } catch (err) {
                console.error("Failed to fetch departments", err);
            }
        };
        fetchDepartments();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'department') {
            fetchBatches(value);
            setFormData(prev => ({ ...prev, department: value, batchId: '', sectionId: '' }));
            setBatches([]);
            setSections([]);
        } else if (name === 'batchId') {
            fetchSections(value);
            setFormData(prev => ({ ...prev, batchId: value, sectionId: '' }));
            setSections([]);
        }
    };

    const fetchBatches = async (departmentId) => {
        if (!departmentId) return;
        try {
            const response = await axios.get('/api/v1/batches', { params: { departmentId } });
            const data = response.data.data || response.data || [];
            setBatches(data.sort((a, b) => b.year - a.year));
        } catch (err) {
            console.error("Failed to fetch batches", err);
        }
    };

    const fetchSections = async (batchId) => {
        if (!batchId) return;
        try {
            const response = await axios.get('/api/v1/sections', { params: { batchId } });
            const data = response.data.data || response.data || [];
            setSections(data.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err) {
            console.error("Failed to fetch sections", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        try {
            // Prepare user data
            const userData = {
                email: formData.email,
                password: formData.password,
                firstName: formData.firstName,
                lastName: formData.lastName,
                status: formData.status
            };

            // Prepare student profile data
            const studentProfileData = {
                rollNumber: formData.rollNumber,
                batchId: formData.batchId,
                departmentId: formData.department,
                sectionId: formData.sectionId,
                semester: parseInt(formData.semester),
                fatherName: formData.fatherName,
                cnic: formData.cnic,
                phone: formData.phone,
                dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).getTime() : null,
                gender: formData.gender,
                nationality: formData.nationality,
                religion: formData.religion
            };

            await axios.post('/api/v1/students', { user: userData, student: studentProfileData });
            setSuccess('Student added successfully!');
            setTimeout(() => navigate('/admin/students'), 1500);
        } catch (err) {
            setError(err.response?.data?.error || 'Operation failed');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setPasswordVisible(!passwordVisible);
    };

    return (
        <div className="dashboard-container student-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/students" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Add New Student</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Add a new student to the university</p>
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
                                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Father Name *</label>
                                <input type="text" name="fatherName" value={formData.fatherName} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">CNIC Number *</label>
                                <input type="text" name="cnic" value={formData.cnic} onChange={handleChange} className="form-input" placeholder="xxxxx-xxxxxxx-x" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} className="form-input" required>
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Nationality *</label>
                                <input type="text" name="nationality" value={formData.nationality} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Religion *</label>
                                <select name="religion" value={formData.religion} onChange={handleChange} className="form-input" required>
                                    <option value="">Select Religion</option>
                                    <option value="islam">Islam</option>
                                    <option value="christianity">Christianity</option>
                                    <option value="hinduism">Hinduism</option>
                                    <option value="buddhism">Buddhism</option>
                                    <option value="sikhism">Sikhism</option>
                                    <option value="judaism">Judaism</option>
                                    <option value="other">Other</option>
                                    <option value="prefer_not_to_say">Prefer not to say</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Academic Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Academic Information</h3>

                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Roll Number *</label>
                                <input type="text" name="rollNumber" value={formData.rollNumber} onChange={handleChange} className="form-input" placeholder="Enter roll number (e.g., BSCS24001)" required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select name="department" value={formData.department} onChange={handleChange} className="form-input" required>
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name} ({dept.code})</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Batch *</label>
                                <select name="batchId" value={formData.batchId} onChange={handleChange} className="form-input" required disabled={!formData.department}>
                                    <option value="">{formData.department ? 'Select Batch' : 'Select Department First'}</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Section *</label>
                                <select name="sectionId" value={formData.sectionId} onChange={handleChange} className="form-input" required disabled={!formData.batchId}>
                                    <option value="">{formData.batchId ? 'Select Section' : 'Select Batch First'}</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>Section {section.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select name="semester" value={formData.semester} onChange={handleChange} className="form-input">
                                    <option value="1">1st Semester</option>
                                    <option value="2">2nd Semester</option>
                                    <option value="3">3rd Semester</option>
                                    <option value="4">4th Semester</option>
                                    <option value="5">5th Semester</option>
                                    <option value="6">6th Semester</option>
                                    <option value="7">7th Semester</option>
                                    <option value="8">8th Semester</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Account Setup */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Account Setup</h3>

                        <div className="form-grid">
                            <div className="form-group full-width">
                                <label className="form-label">Password *</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={passwordVisible ? "text" : "password"}
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="form-input"
                                        required
                                    />
                                    <button type="button" className="password-toggle" onClick={togglePasswordVisibility}>
                                        <span className="material-symbols-outlined">{passwordVisible ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Confirm Password *</label>
                                <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="form-input" required />
                            </div>

                            <div className="form-group full-width">
                                <label className="form-label">Status</label>
                                <select name="status" value={formData.status} onChange={handleChange} className="form-input">
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="form-actions">
                        <Link to="/admin/students" className="btn-cancel-custom">
                            Cancel
                        </Link>
                        <button type="submit" className="auth-submit-btn" disabled={loading}>
                            {loading ? 'Processing...' : 'Add Student'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentForm;

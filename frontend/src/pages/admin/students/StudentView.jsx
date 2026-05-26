import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import './StudentList.css';

const StudentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [student, setStudent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [department, setDepartment] = useState(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalStep, setModalStep] = useState(1);
    const [adminPassword, setAdminPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const closeModal = () => {
        setIsModalOpen(false);
        setModalStep(1);
        setAdminPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowNewPassword(false);
        setShowConfirmPassword(false);
    };

    useEffect(() => {
        fetchStudentData();
    }, [id]);

    const fetchStudentData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/v1/students/${id}`);
            const studentData = response.data.data || response.data;
            setStudent(studentData);

            if (studentData.departmentId) {
                const deptRes = await axios.get('/api/v1/departments');
                const departments = deptRes.data.data || deptRes.data;
                const dept = departments.find(d => d.id == studentData.departmentId);
                setDepartment(dept || null);
            }
        } catch (error) {
            console.error('Error fetching student:', error);
            alert('Failed to load student data');
            navigate('/admin/students');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAdmin = async () => {
        if (!adminPassword) return alert('Please enter your password');
        try {
            // We use the login endpoint to verify admin credentials
            const adminEmail = currentUser?.email;
            await axios.post('/api/v1/auth/login', { email: adminEmail, password: adminPassword });
            setModalStep(2);
        } catch (error) {
            alert('Invalid admin password');
        }
    };

    const handleUpdatePassword = async () => {
        if (newPassword.length < 6) return alert('Password must be at least 6 characters');
        if (newPassword !== confirmPassword) return alert('Passwords do not match');

        try {
            // Update user password via the students endpoint
            // The backend expects { user: { password: ... }, student: { ... } }
            await axios.put(`/api/v1/students/${id}`, {
                user: { password: newPassword },
                student: {} // Empty object to avoid backend TypeError on studentData.departmentId
            });
            alert('Password updated successfully!');
            closeModal();
        } catch (error) {
            console.error('Error updating password:', error);
            alert('Failed to update password');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!student) return null;

    const user = student.user || {};
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
    const initials = (firstName?.[0] || '') + (lastName?.[0] || '') || 'ST';

    return (
        <div className="dashboard-container student-management-page">
            <div className="student-view-container" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/admin/students" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>arrow_back</span>
                    </Link>
                    <h1 className="page-title" style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700 }}>Student Details</h1>
                </div>
                <p className="header-right-subtitle" style={{ margin: 0, paddingLeft: '2.8rem', marginTop: '0.25rem' }}>View complete student information</p>
            </div>

            <div className="card student-view-card student-view-container shadow-sm">
                {/* Student Header with Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid var(--slate-200)', marginBottom: '2.5rem' }}>
                    <div className="student-header-avatar">
                        <span>{initials.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--slate-800)' }}>
                            {fullName}
                        </h2>
                        <p style={{ color: 'var(--slate-500)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>{user.email}</p>
                        <span className={`status-badge status-${user.status || 'active'}`}>
                            {user.status || 'Active'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setIsModalOpen(true)} className="btn-manage-password">
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>key</span>
                            Manage Password
                        </button>
                        <Link to={`/admin/students/${id}/edit`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', background: '#8B5CF6', color: 'white', textDecoration: 'none', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                            Edit
                        </Link>
                    </div>
                </div>

                {/* Personal Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 className="student-view-section-title">Personal Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>First Name</label>
                            <p>{firstName || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Last Name</label>
                            <p>{lastName || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Father Name</label>
                            <p>{student.fatherName || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>CNIC</label>
                            <p>{student.cnic || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Email</label>
                            <p>{user.email || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Phone</label>
                            <p>{student.phone || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Date of Birth</label>
                            <p>{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Gender</label>
                            <p style={{ textTransform: 'capitalize' }}>{student.gender || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Nationality</label>
                            <p>{student.nationality || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Religion</label>
                            <p style={{ textTransform: 'capitalize' }}>{student.religion?.replace('_', ' ') || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Academic Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 className="student-view-section-title">Academic Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Roll Number</label>
                            <p className="roll-number">{student.rollNumber || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Batch</label>
                            <p>{student.batch?.name || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Department</label>
                            <p>{department?.name || 'N/A'}</p>
                        </div>
                        <div className="info-item">
                            <label>Section</label>
                            <p>{student.section?.name || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Semester</label>
                            <p>{student.semester || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>CGPA</label>
                            <p className="cgpa-value">{parseFloat(student.cgpa || 0).toFixed(2)}</p>
                        </div>
                        <div className="info-item">
                            <label>Credit Hours</label>
                            <p>{student.earnedCredits || 0} / {department?.totalCreditHours || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Account Status */}
                <div>
                    <h3 className="student-view-section-title">Account Status</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Status</label>
                            <p style={{ textTransform: 'capitalize' }}>{user.status || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Created On</label>
                            <p>{student.createdAt ? new Date(student.createdAt).toLocaleDateString() : '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Password Manager Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && closeModal()}>
                    <div className="card modal-content" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 className="modal-title" style={{ margin: 0, fontSize: '1.25rem' }}>Manage Password</h3>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-500)' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {modalStep === 1 ? (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'var(--slate-600)', fontSize: '0.875rem' }}>
                                    Please enter your administrator password to proceed.
                                </p>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Admin Password</label>
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Enter your password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                    />
                                </div>
                                <button onClick={handleVerifyAdmin} className="auth-submit-btn">Verify Identity</button>
                            </div>
                        ) : (
                            <div>
                                <p style={{ marginBottom: '1rem', color: 'var(--slate-600)', fontSize: '0.875rem' }}>
                                    Set a new password for <strong>{fullName}</strong>.
                                </p>
                                <div className="form-group" style={{ marginBottom: '1rem' }}>
                                    <label className="form-label">New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="password-toggle-btn">
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                                {showNewPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                    <label className="form-label">Confirm New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle-btn">
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                                                {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                                <button onClick={handleUpdatePassword} className="auth-submit-btn success">Update Password</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentView;

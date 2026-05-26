import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../../context/AuthContext';
import './TeacherList.css';

const TeacherView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [teacher, setTeacher] = useState(null);
    const [loading, setLoading] = useState(true);

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
        fetchTeacherData();
    }, [id]);

    const fetchTeacherData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/v1/teachers/${id}`);
            const teacherData = response.data.data || response.data;
            setTeacher(teacherData);
        } catch (error) {
            console.error('Error fetching teacher:', error);
            alert('Failed to load teacher data');
            navigate('/admin/teachers');
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
            // Update user password via the teachers endpoint
            await axios.put(`/api/v1/teachers/${id}`, {
                user: { password: newPassword },
                teacher: {} // Placeholder to match backend update structure if needed
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

    if (!teacher) return null;

    const user = teacher.user || {};
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim() || 'Unknown';
    const initials = (firstName?.[0] || '') + (lastName?.[0] || '') || 'TC';

    return (
        <div className="dashboard-container teacher-management-page">
            <div className="teacher-view-container" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/admin/teachers" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.8rem' }}>arrow_back</span>
                    </Link>
                    <h1 className="page-title" style={{ margin: 0, fontSize: '1.875rem', fontWeight: 700 }}>Teacher Details</h1>
                </div>
                <p className="page-subtitle" style={{ margin: 0, paddingLeft: '2.8rem', marginTop: '0.25rem' }}>View complete teacher information</p>
            </div>

            <div className="card teacher-view-card teacher-view-container">
                {/* Teacher Header with Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', paddingBottom: '2rem', borderBottom: '2px solid var(--slate-100)', marginBottom: '2rem' }}>
                    <div className="teacher-header-avatar">
                        <span>{initials.toUpperCase()}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
                            {fullName}
                        </h2>
                        <p style={{ color: 'var(--slate-500)', fontSize: '0.9375rem', margin: '0 0 0.5rem 0' }}>{user.email}</p>
                        <span className={`status-badge status-${user.status || 'active'}`} style={{ display: 'inline-block' }}>
                            {user.status || 'Active'}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button onClick={() => setIsModalOpen(true)} className="btn-manage-password">
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>key</span>
                            Manage Password
                        </button>
                        <Link to={`/admin/teachers/${id}/edit`} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 1.25rem', borderRadius: '0.625rem', fontWeight: 600, fontSize: '0.875rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                            Edit
                        </Link>
                    </div>
                </div>

                {/* Personal Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 className="teacher-view-section-title">Personal Information</h3>
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
                            <label>CNIC Number</label>
                            <p>{teacher.cnic || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Phone</label>
                            <p>{teacher.phone || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Date of Birth</label>
                            <p>{teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Gender</label>
                            <p style={{ textTransform: 'capitalize' }}>{teacher.gender || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Nationality</label>
                            <p>{teacher.nationality || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Religion</label>
                            <p style={{ textTransform: 'capitalize' }}>{teacher.religion || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Academic Information */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h3 className="teacher-view-section-title">Academic Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Teacher ID</label>
                            <p>{teacher.employeeId || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Email</label>
                            <p>{user.email || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Joining Date</label>
                            <p>{teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Faculty Type</label>
                            <p style={{ textTransform: 'capitalize' }}>{teacher.employmentType || '-'}</p>
                        </div>
                    </div>
                </div>

                {/* Account Status */}
                <div>
                    <h3 className="teacher-view-section-title">Account Status</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <label>Status</label>
                            <p style={{ textTransform: 'capitalize' }}>{user.status || '-'}</p>
                        </div>
                        <div className="info-item">
                            <label>Created On</label>
                            <p>{teacher.createdAt ? new Date(teacher.createdAt).toLocaleDateString() : '-'}</p>
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
                                        <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="password-toggle">
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
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="password-toggle">
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

export default TeacherView;

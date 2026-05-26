import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './StudentList.css';

const StudentEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // Form State
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
        batchId: '',
        departmentId: '',
        sectionId: '',
        semester: '1',
        cgpa: '0.00',
        status: 'active'
    });

    // Helper State
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch initial data
    useEffect(() => {
        const initData = async () => {
            try {
                setLoading(true);
                // Fetch departments
                const deptRes = await axios.get('/api/v1/departments');
                const loadedDepts = deptRes.data.data || [];
                setDepartments(loadedDepts);

                // Fetch student data
                const res = await axios.get(`/api/v1/students/${id}`);
                const student = res.data.data;

                if (student) {
                    let formattedDOB = '';
                    if (student.dateOfBirth && student.dateOfBirth !== '0000-00-00') {
                        const dateObj = new Date(student.dateOfBirth);
                        if (!isNaN(dateObj.getTime())) {
                            formattedDOB = dateObj.toISOString().split('T')[0];
                        }
                    }

                    const studentData = {
                        firstName: student.user?.firstName || '',
                        lastName: student.user?.lastName || '',
                        fatherName: student.fatherName || '',
                        cnic: student.cnic || '',
                        email: student.user?.email || '',
                        phone: student.phone || '',
                        dateOfBirth: formattedDOB,
                        gender: student.gender || '',
                        nationality: student.nationality || '',
                        religion: student.religion || '',
                        rollNumber: student.rollNumber || '',
                        batchId: student.batchId?.toString() || '',
                        departmentId: student.departmentId?.toString() || '',
                        sectionId: student.sectionId?.toString() || '',
                        semester: student.semester?.toString() || '1',
                        cgpa: student.cgpa?.toString() || '0.00',
                        status: student.user?.status || 'active'
                    };
                    setFormData(studentData);

                    // Load batches for this department
                    if (student.departmentId) {
                        const batchRes = await axios.get(`/api/v1/batches?departmentId=${student.departmentId}`);
                        const loadedBatches = batchRes.data.data || batchRes.data || [];
                        setBatches(loadedBatches);

                        // Load sections for this batch
                        if (student.batchId) {
                            const sectionRes = await axios.get(`/api/v1/sections?batchId=${student.batchId}`);
                            const loadedSections = sectionRes.data.data || sectionRes.data || [];
                            setSections(loadedSections);
                        }
                    }
                }
            } catch (err) {
                console.error('Fetch error:', err);
                setError('Failed to load student data');
            } finally {
                setLoading(false);
            }
        };

        if (id) initData();
    }, [id]);

    // Handle Department Change
    const handleDepartmentChange = async (deptId) => {
        const idStr = deptId?.toString() || '';
        setFormData(prev => ({ ...prev, departmentId: idStr, batchId: '', sectionId: '' }));
        setBatches([]);
        setSections([]);

        if (idStr) {
            try {
                const res = await axios.get(`/api/v1/batches?departmentId=${idStr}`);
                const data = res.data.data || res.data || [];
                setBatches(data);
            } catch (err) {
                console.error('Error loading batches:', err);
            }
        }
    };

    // Handle Batch Change
    const handleBatchChange = async (batchId) => {
        const idStr = batchId?.toString() || '';
        setFormData(prev => ({ ...prev, batchId: idStr, sectionId: '' }));
        setSections([]);

        if (idStr) {
            try {
                const res = await axios.get(`/api/v1/sections?batchId=${idStr}`);
                const data = res.data.data || res.data || [];
                setSections(data);
            } catch (err) {
                console.error('Error loading sections:', err);
            }
        }
    };

    // Move Semester
    const handleMoveSemester = async (direction) => {
        const currentSemester = parseInt(formData.semester) || 1;
        const nextSemester = direction === 'next' ? currentSemester + 1 : currentSemester - 1;

        if (nextSemester < 1) return;

        let message = direction === 'next'
            ? `Are you sure you want to move this student to Semester ${nextSemester}?`
            : `Are you sure you want to move this student back to Semester ${nextSemester}?`;

        if (currentSemester >= 8 && direction === 'next') {
            message = `This student is currently in Semester ${currentSemester}.\n\nMoving them forward will set them as Graduated (if passed) or move to Semester 9+.\n\nAre you sure you want to continue?`;
        }

        if (!window.confirm(message)) return;

        try {
            setSubmitLoading(true);
            const updateData = {
                student: { semester: nextSemester }
            };

            await axios.put(`/api/v1/students/${id}`, updateData);
            setFormData(prev => ({ ...prev, semester: nextSemester.toString() }));
            setSuccess(`Student moved to Semester ${nextSemester} successfully!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Move semester error:', err);
            setError(err.response?.data?.error || 'Failed to move semester');
        } finally {
            setSubmitLoading(false);
        }
    };

    // Handle Submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);
        setError('');
        setSuccess('');

        try {
            const updateData = {
                user: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    status: formData.status
                },
                student: {
                    rollNumber: formData.rollNumber,
                    batchId: formData.batchId,
                    departmentId: formData.departmentId,
                    sectionId: formData.sectionId,
                    semester: parseInt(formData.semester),
                    cgpa: parseFloat(formData.cgpa) || 0,
                    fatherName: formData.fatherName,
                    cnic: formData.cnic,
                    phone: formData.phone,
                    dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
                    gender: formData.gender,
                    nationality: formData.nationality,
                    religion: formData.religion
                }
            };

            await axios.put(`/api/v1/students/${id}`, updateData);
            setSuccess('Student updated successfully!');
            setTimeout(() => navigate('/admin/students'), 1500);
        } catch (err) {
            console.error('Update error:', err);
            setError(err.response?.data?.error || 'Failed to update student');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="student-management-page">
                <div className="content-area">
                    <div className="flex items-center justify-center min-h-[400px]">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container student-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/students" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Edit Student</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Update student information</p>
                    </div>
                </div>
            </div>

            <div className="card" style={{ maxWidth: '720px', padding: '2.5rem' }}>
                {error && (
                    <div className="alert alert-error show">
                        <span className="material-symbols-outlined">error</span>
                        {error}
                    </div>
                )}

                {success && (
                    <div className="alert alert-success show">
                        <span className="material-symbols-outlined">check_circle</span>
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    {/* Personal Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Personal Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">First Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Last Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Father Name *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.fatherName}
                                    onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">CNIC Number *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.cnic}
                                    onChange={(e) => setFormData({ ...formData, cnic: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email *</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={formData.email}
                                    disabled
                                    style={{ cursor: 'not-allowed' }}
                                />
                                <span className="text-[0.75rem] text-slate-500 mt-1">Email cannot be changed</span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Phone *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Date of Birth *</label>
                                <input
                                    type="date"
                                    className="form-input"
                                    value={formData.dateOfBirth}
                                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Gender *</label>
                                <select
                                    className="form-input"
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    required
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nationality *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.nationality}
                                    onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Religion *</label>
                                <select
                                    className="form-input"
                                    value={formData.religion}
                                    onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
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

                    {/* Academic Information */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <h3 className="student-form-section-title">Academic Information</h3>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Roll Number *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={formData.rollNumber}
                                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Batch *</label>
                                <select
                                    className="form-input"
                                    value={formData.batchId}
                                    onChange={(e) => handleBatchChange(e.target.value)}
                                    required
                                    disabled={!formData.departmentId}
                                >
                                    <option value="">{formData.departmentId ? 'Select Batch' : 'Select Department First'}</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.name || batch.year}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department *</label>
                                <select
                                    className="form-input"
                                    value={formData.departmentId}
                                    onChange={(e) => handleDepartmentChange(e.target.value)}
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
                                <label className="form-label">Section *</label>
                                <select
                                    className="form-input"
                                    value={formData.sectionId}
                                    onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                                    required
                                    disabled={!formData.batchId}
                                >
                                    <option value="">{formData.batchId ? 'Select Section' : 'Select Batch First'}</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>
                                            Section {section.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Semester</label>
                                <select
                                    className="form-input"
                                    value={formData.semester}
                                    onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem}>{sem}{sem === 1 ? 'st' : sem === 2 ? 'nd' : sem === 3 ? 'rd' : 'th'} Semester</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">CGPA</label>
                                <input
                                    type="number"
                                    className="form-input"
                                    step="0.01"
                                    min="0"
                                    max="4"
                                    value={formData.cgpa}
                                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                                />
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
                                    className="form-input"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">Active</option>
                                    <option value="suspended">Suspended</option>
                                    <option value="graduated">Graduated</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Move Semester</label>
                                <div className="flex flex-row gap-4">
                                    <button
                                        type="button"
                                        onClick={() => handleMoveSemester('prev')}
                                        disabled={parseInt(formData.semester) <= 1 || formData.status === 'graduated' || submitLoading}
                                        className="btn-move-semester btn-prev flex-1 text-white"
                                    >
                                        <span className="material-symbols-outlined">arrow_downward</span>
                                        Previous
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleMoveSemester('next')}
                                        disabled={formData.status === 'graduated' || submitLoading}
                                        className="btn-move-semester btn-next flex-1 text-white"
                                    >
                                        <span className="material-symbols-outlined">arrow_upward</span>
                                        Next
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Buttons */}
                    <div className="form-actions">
                        <Link to="/admin/students" className="btn-cancel-custom">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={submitLoading}
                            className="auth-submit-btn min-w-[200px]"
                        >
                            {submitLoading ? (
                                <>
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                    Updating...
                                </>
                            ) : (
                                'Update Student'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StudentEdit;

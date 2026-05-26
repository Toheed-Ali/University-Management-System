import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './OfferingList.css';

const OfferingEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [alert, setAlert] = useState({ show: false, message: '', type: '' });

    // Data lists
    const [departments, setDepartments] = useState([]);
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);

    const [formData, setFormData] = useState({
        departmentId: '',
        batchId: '',
        sectionId: '',
        courseId: '',
        teacherId: '',
        semester: '',
    });

    useEffect(() => {
        initPage();
    }, [id]);

    const initPage = async () => {
        setLoading(true);
        try {
            // Load base data first
            await Promise.all([
                loadDepartments(),
                loadTeachers()
            ]);

            // Then load specific offering data
            await loadOfferingData();
        } catch (error) {
            console.error('Initialization error:', error);
            showAlert('Failed to initialize page data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadDepartments = async () => {
        try {
            const res = await axios.get('/api/v1/departments');
            const data = Array.isArray(res.data) ? res.data : res.data.data;
            setDepartments(data || []);
        } catch (error) {
            console.error('Load departments error:', error);
        }
    };

    const loadTeachers = async () => {
        try {
            const res = await axios.get('/api/v1/teachers');
            const data = res.data.data || res.data || [];
            setTeachers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Load teachers error:', error);
        }
    };

    const loadOfferingData = async () => {
        try {
            const res = await axios.get(`/api/v1/offerings/${id}`);
            const offering = res.data.data || res.data;

            if (!offering) {
                throw new Error('Offering not found');
            }

            // Load dependent lists FIRST
            if (offering.departmentId) {
                await Promise.all([
                    loadBatches(offering.departmentId),
                    loadCourses(offering.departmentId)
                ]);
            }

            if (offering.batchId) {
                await loadSections(offering.batchId, offering.departmentId || offering.department?.id);
            }

            // Set form data LAST to ensure selected options exist in dropdowns
            setFormData({
                departmentId: offering.departmentId || offering.department?.id || '',
                batchId: offering.batchId || offering.batch?.id || '',
                sectionId: offering.sectionId || offering.section?.id || '',
                courseId: offering.courseId || offering.course?.id || '',
                teacherId: offering.teacherId || offering.teacher?.id || offering.instructor?.id || '',
                semester: offering.semester || '',
            });

        } catch (error) {
            console.error('Load offering data error:', error);
            showAlert('Failed to load offering details', 'error');
        }
    };

    const loadBatches = async (deptId) => {
        try {
            const res = await axios.get(`/api/v1/batches?departmentId=${deptId}`);
            const data = res.data.data || res.data || [];
            setBatches(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Load batches error:', error);
        }
    };

    const loadSections = async (batchId, deptId) => {
        try {
            const res = await axios.get(`/api/v1/sections?batchId=${batchId}&departmentId=${deptId}`);
            const data = res.data.data || res.data || [];
            setSections(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Load sections error:', error);
        }
    };

    const loadCourses = async (deptId) => {
        try {
            const res = await axios.get('/api/v1/courses');
            const allCourses = res.data.data || (Array.isArray(res.data) ? res.data : []);
            const filtered = allCourses.filter(c =>
                String(c.departmentId) === String(deptId) &&
                (c.status === 'active' || !c.status)
            );
            setCourses(filtered);
        } catch (error) {
            console.error('Load courses error:', error);
        }
    };

    const handleDepartmentChange = async (e) => {
        const deptId = e.target.value;
        setFormData(prev => ({
            ...prev,
            departmentId: deptId,
            batchId: '',
            sectionId: '',
            courseId: ''
        }));
        setBatches([]);
        setSections([]);
        setCourses([]);

        if (deptId) {
            await Promise.all([
                loadBatches(deptId),
                loadCourses(deptId)
            ]);
        }
    };

    const handleBatchChange = async (e) => {
        const batchId = e.target.value;
        setFormData(prev => ({
            ...prev,
            batchId: batchId,
            sectionId: ''
        }));
        setSections([]);

        if (batchId) {
            await loadSections(batchId, formData.departmentId);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const showAlert = (message, type = 'error') => {
        setAlert({ show: true, message, type });
        if (type === 'success') {
            setTimeout(() => setAlert({ show: false, message: '', type: '' }), 3000);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const offeringData = {
                ...formData,
                teacherId: formData.teacherId || null
            };

            await axios.put(`/api/v1/offerings/${id}`, offeringData);
            showAlert('Offering updated successfully!', 'success');

            setTimeout(() => {
                navigate('/admin/offerings');
            }, 1500);

        } catch (error) {
            console.error('Submit error:', error);
            showAlert(error.response?.data?.message || error.response?.data?.error || 'Update failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-container offering-management-page">
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-500)' }}>
                    Loading offering details...
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container offering-management-page">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                    <Link to="/admin/offerings" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none', marginTop: '3.2px' }}>
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="page-title" style={{ marginBottom: '0.25rem' }}>Edit Offering</h1>
                        <p className="page-subtitle" style={{ margin: 0 }}>Update course offering details</p>
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
                        <h3 className="offering-form-section-title">Course Details</h3>

                        <div className="form-grid">
                            {/* Department Selection */}
                            <div className="form-group full-width">
                                <label className="form-label">Department *</label>
                                <select
                                    name="departmentId"
                                    className="offering-input-field"
                                    required
                                    value={formData.departmentId}
                                    onChange={handleDepartmentChange}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Batch Selection */}
                            <div className="form-group">
                                <label className="form-label">Batch *</label>
                                <select
                                    name="batchId"
                                    className="offering-input-field"
                                    required
                                    value={formData.batchId}
                                    onChange={handleBatchChange}
                                    disabled={!formData.departmentId}
                                >
                                    <option value="">{formData.departmentId ? 'Select Batch' : 'Select Department First'}</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Section Selection */}
                            <div className="form-group">
                                <label className="form-label">Section *</label>
                                <select
                                    name="sectionId"
                                    className="offering-input-field"
                                    required
                                    value={formData.sectionId}
                                    onChange={handleChange}
                                    disabled={!formData.batchId}
                                >
                                    <option value="">{formData.batchId ? 'Select Section' : 'Select Batch First'}</option>
                                    {sections.map(section => (
                                        <option key={section.id} value={section.id}>{section.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Semester Selection */}
                            <div className="form-group">
                                <label className="form-label">Offering Semester *</label>
                                <select
                                    name="semester"
                                    className="offering-input-field"
                                    required
                                    value={formData.semester}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Semester</option>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                        <option key={sem} value={sem}>Semester {sem}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Course Selection */}
                            <div className="form-group full-width">
                                <label className="form-label">Course *</label>
                                <select
                                    name="courseId"
                                    className="offering-input-field"
                                    required
                                    value={formData.courseId}
                                    onChange={handleChange}
                                    disabled={!formData.departmentId}
                                >
                                    <option value="">{formData.departmentId ? 'Select Course' : 'Select Department First'}</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
                                    ))}
                                </select>
                                <span style={{ fontSize: '0.75rem', color: 'var(--slate-500)', marginTop: '0.25rem', display: 'block' }}>
                                    Only active courses matching the selected department are shown.
                                </span>
                            </div>

                            {/* Teacher Selection */}
                            <div className="form-group full-width">
                                <label className="form-label">Instructor (Optional For Now)</label>
                                <select
                                    name="teacherId"
                                    className="offering-input-field"
                                    value={formData.teacherId}
                                    onChange={handleChange}
                                >
                                    <option value="">Select Instructor</option>
                                    {teachers.map(teacher => {
                                        const user = teacher.user || teacher.profile || {};
                                        const name = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || teacher.email || 'Unknown Instructor';
                                        return (
                                            <option key={teacher.id || teacher.userId} value={teacher.id || teacher.userId}>
                                                {name} {user.email ? `(${user.email})` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        <Link to="/admin/offerings" className="btn-cancel-custom">Cancel</Link>
                        <button type="submit" className="auth-submit-btn" disabled={submitting}>
                            {submitting ? 'Updating...' : 'Update Offering'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OfferingEdit;

import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './DepartmentView.css';

const DepartmentView = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [department, setDepartment] = useState(null);
    const [batches, setBatches] = useState([]);
    const [sections, setSections] = useState([]);
    const [courses, setCourses] = useState([]);
    const [expandedBatches, setExpandedBatches] = useState([]);
    const [expandedSections, setExpandedSections] = useState([]);
    const [allStudents, setAllStudents] = useState([]);

    // Modal states
    const [showAddBatchModal, setShowAddBatchModal] = useState(false);
    const [batchForm, setBatchForm] = useState({ session: 'Fall', year: new Date().getFullYear() });

    const [showAddSectionModal, setShowAddSectionModal] = useState(false);
    const [sectionForm, setSectionForm] = useState({ name: '', batchId: null, batchName: '' });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, batchesRes, sectionsRes, coursesRes, studentsRes] = await Promise.all([
                axios.get(`/api/v1/departments/${id}`),
                axios.get(`/api/v1/batches?departmentId=${id}`),
                axios.get(`/api/v1/sections?departmentId=${id}`),
                axios.get(`/api/v1/courses`),
                axios.get(`/api/v1/students`)
            ]);

            setDepartment(deptRes.data.data || deptRes.data);
            setBatches(batchesRes.data.data || batchesRes.data || []);
            setSections(sectionsRes.data.data || sectionsRes.data || []);

            // Filter courses by department
            const allCourses = coursesRes.data.data || coursesRes.data || [];
            const deptCourses = allCourses.filter(c => c.departmentId == id || c.department?.id == id);
            setCourses(deptCourses);

            const rawStudents = studentsRes.data.data || studentsRes.data || [];
            const sortedStudents = [...rawStudents].sort((a, b) =>
                (a.rollNumber || "").localeCompare(b.rollNumber || "", undefined, { numeric: true, sensitivity: 'base' })
            );
            setAllStudents(sortedStudents);
        } catch (err) {
            console.error("Failed to fetch data:", err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBatch = (batchId) => {
        setExpandedBatches(prev =>
            prev.includes(batchId) ? prev.filter(id => id !== batchId) : [...prev, batchId]
        );
    };

    const toggleSection = (batchId, sectionId) => {
        const key = `${batchId}-${sectionId}`;
        setExpandedSections(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const handleAddBatch = async () => {
        if (!batchForm.year) return alert("Please enter a year");
        try {
            const name = `${batchForm.session} ${batchForm.year}`;
            await axios.post('/api/v1/batches', {
                name,
                year: parseInt(batchForm.year),
                departmentId: id,
                status: 'active'
            });
            setShowAddBatchModal(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 400) {
                alert(err.response.data.message);
            } else {
                alert("Failed to create batch");
            }
        }
    };

    const handleAddSection = async () => {
        if (!sectionForm.name) return alert("Please enter section name");
        try {
            await axios.post('/api/v1/sections', {
                name: sectionForm.name.toUpperCase(),
                batchId: sectionForm.batchId,
                departmentId: id,
                status: 'active'
            });
            setShowAddSectionModal(false);
            fetchData();
        } catch (err) {
            if (err.response && err.response.status === 400) {
                alert(err.response.data.message);
            } else {
                alert("Failed to create section");
            }
        }
    };

    const deleteBatch = async (batchId, name, e) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete ${name}?`)) return;
        try {
            await axios.delete(`/api/v1/batches/${batchId}`);
            fetchData();
        } catch (err) {
            alert("Failed to delete batch. It might contain sections or students.");
        }
    };

    const deleteSection = async (sectionId, name, e) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete Section ${name}?`)) return;
        try {
            await axios.delete(`/api/v1/sections/${sectionId}`);
            fetchData();
        } catch (err) {
            alert("Failed to delete section. It might contain students.");
        }
    };

    const handleDeleteDepartment = async () => {
        if (!confirm('Are you sure you want to delete this department? This action cannot be undone.')) return;
        try {
            await axios.delete(`/api/v1/departments/${id}`);
            navigate('/admin/departments');
        } catch (err) {
            alert('Failed to delete department');
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (!department) return <div className="error">Department not found</div>;

    return (
        <div className="content-area department-view-container">
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                        <Link to="/admin/departments" style={{ display: 'flex', alignItems: 'center', color: 'var(--slate-500)', textDecoration: 'none' }}>
                            <span className="material-symbols-outlined">arrow_back</span>
                        </Link>
                        <h1 className="page-title">{department?.name}</h1>
                    </div>
                    <p className="page-subtitle">Code: {department?.code}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => navigate(`/admin/departments/${id}/edit`)} className="btn-primary">
                        <span className="material-symbols-outlined">edit</span>
                        Edit
                    </button>
                    <button onClick={handleDeleteDepartment} className="btn-danger">
                        <span className="material-symbols-outlined">delete</span>
                        Delete
                    </button>
                </div>
            </div>

            {/* Department Content */}
            <div className="card">
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>Department Batches & Students</h3>
                    <button onClick={() => setShowAddBatchModal(true)} className="btn-primary" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.625rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add</span>
                        Add Batch
                    </button>
                </div>

                <div className="batches-container">
                    {batches.length > 0 ? batches.map(batch => {
                        const batchSections = sections.filter(s => s.batchId === batch.id);
                        const batchStudents = allStudents.filter(s =>
                            (s.departmentId == id) && (
                                s.batchId == batch.id ||
                                s.batch == batch.name
                            )
                        );

                        return (
                            <div key={batch.id} className="batch-item">
                                <div className="batch-header" onClick={() => toggleBatch(batch.id)}>
                                    <div className="batch-info">
                                        <span className="material-symbols-outlined batch-icon">event</span>
                                        <h4 className="batch-title">{batch.name}</h4>
                                        <span className="badge">{batchStudents.length} students</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <button className="icon-btn-danger" onClick={(e) => deleteBatch(batch.id, batch.name, e)}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                                        </button>
                                        <span className="material-symbols-outlined expand-icon">
                                            {expandedBatches.includes(batch.id) ? 'expand_less' : 'expand_more'}
                                        </span>
                                    </div>
                                </div>

                                {expandedBatches.includes(batch.id) && (
                                    <div className="batch-content">
                                        <div className="batch-actions">
                                            <button
                                                onClick={() => {
                                                    setSectionForm({ name: '', batchId: batch.id, batchName: batch.name });
                                                    setShowAddSectionModal(true);
                                                }}
                                                className="btn-secondary btn-sm"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 1rem', background: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.125rem' }}>add</span>
                                                Add Section
                                            </button>
                                        </div>
                                        <div className="sections-container">
                                            {batchSections.length > 0 ? batchSections.map(section => {
                                                const sectionStudents = batchStudents.filter(s =>
                                                    s.sectionId == section.id
                                                );
                                                const sectionKey = `${batch.id}-${section.id}`;

                                                return (
                                                    <div key={section.id} className="section-item">
                                                        <div className="section-header" onClick={() => toggleSection(batch.id, section.id)}>
                                                            <div className="section-info">
                                                                <span className="material-symbols-outlined section-icon">folder</span>
                                                                <h5 className="section-title">Section {section.name}</h5>
                                                                <span className="badge-sm">{sectionStudents.length} students</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <button className="icon-btn-danger" onClick={(e) => deleteSection(section.id, section.name, e)}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                                                                </button>
                                                                <span className="material-symbols-outlined expand-icon">
                                                                    {expandedSections.includes(sectionKey) ? 'expand_more' : 'chevron_right'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {expandedSections.includes(sectionKey) && (
                                                            <div className="section-students">
                                                                {sectionStudents.length > 0 ? sectionStudents.map(student => (
                                                                    <div key={student.id} className="list-item">
                                                                        <div className="list-item-icon" style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                                                                            <span className="material-symbols-outlined" style={{ color: '#8B5CF6' }}>school</span>
                                                                        </div>
                                                                        <div className="list-item-content">
                                                                            <h4 className="list-item-title">{student.user?.firstName} {student.user?.lastName}</h4>
                                                                            <p className="list-item-subtitle">{student.rollNumber || student.user?.email}</p>
                                                                        </div>
                                                                        <span className={`status-badge status-${student.status}`}>{student.status}</span>
                                                                    </div>
                                                                )) : <div style={{ padding: '1rem', color: 'var(--slate-500)', fontSize: '0.875rem' }}>No students in this section</div>}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }) : <p style={{ padding: '1rem', color: 'var(--slate-500)' }}>No sections. Add a section to enroll students.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    }) : (
                        <div className="empty-state" style={{ padding: '3rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--slate-300)' }}>school</span>
                            <p style={{ marginTop: '1rem', color: 'var(--slate-500)' }}>No batches or students in this department</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Courses Section */}
            <div className="card" style={{ marginTop: '2rem' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--slate-100)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--slate-800)', margin: 0 }}>Department Courses</h3>
                </div>
                <div className="data-list">
                    {courses.length > 0 ? courses.map(course => (
                        <div key={course.id} className="list-item">
                            <div className="list-item-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>book</span>
                            </div>
                            <div className="list-item-content">
                                <h4 className="list-item-title">{course.name}</h4>
                                <p className="list-item-subtitle">{course.code} • {course.credits} Credits</p>
                            </div>
                            <span className={`status-badge status-${course.status}`}>{course.status}</span>
                        </div>
                    )) : (
                        <div className="empty-state" style={{ padding: '3rem' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '3rem', color: 'var(--slate-300)' }}>book</span>
                            <p style={{ marginTop: '1rem', color: 'var(--slate-500)' }}>No courses in this department</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Batch Modal */}
            {showAddBatchModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)' }}>Add New Batch</h3>
                            <button onClick={() => setShowAddBatchModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="form-group">
                                <label className="form-label">Session</label>
                                <select
                                    className="modal-input"
                                    value={batchForm.session}
                                    onChange={(e) => setBatchForm({ ...batchForm, session: e.target.value })}
                                >
                                    <option value="Spring">Spring</option>
                                    <option value="Fall">Fall</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Year</label>
                                <input
                                    type="number"
                                    className="modal-input"
                                    placeholder="e.g., 2024"
                                    value={batchForm.year}
                                    onChange={(e) => setBatchForm({ ...batchForm, year: e.target.value })}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowAddBatchModal(false)} className="btn-secondary-custom">Cancel</button>
                            <button onClick={handleAddBatch} className="btn-primary" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem' }}>Create Batch</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Section Modal */}
            {showAddSectionModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: 'var(--slate-800)' }}>Add Section to {sectionForm.batchName}</h3>
                            <button onClick={() => setShowAddSectionModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)' }}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="form-group" style={{ marginBottom: '2rem' }}>
                            <label className="form-label">Section Name</label>
                            <input
                                type="text"
                                className="modal-input"
                                placeholder="e.g., A, B"
                                value={sectionForm.name}
                                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setShowAddSectionModal(false)} className="btn-secondary-custom">Cancel</button>
                            <button onClick={handleAddSection} className="btn-primary" style={{ padding: '0.625rem 1.25rem', borderRadius: '0.5rem' }}>Create Section</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentView;

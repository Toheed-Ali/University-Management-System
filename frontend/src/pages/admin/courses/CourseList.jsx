import { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './CourseList.css';

const DepartmentGroup = ({ deptName, courses, onDelete }) => {
    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className={`department-group ${collapsed ? 'collapsed' : ''}`}>
            <div className="department-header" onClick={() => setCollapsed(!collapsed)}>
                <div className="dept-info">
                    <span className="material-symbols-outlined dept-icon">corporate_fare</span>
                    <h3>{deptName}</h3>
                    <span className="badge">{courses.length} courses</span>
                </div>
                <span className="material-symbols-outlined expand-icon">expand_more</span>
            </div>
            <div className="department-content-wrapper">
                <div className="department-content-inner">
                    <div className="department-content" style={{ padding: '1.5rem' }}>
                        <div className="courses-grid">
                            {courses.map(course => (
                                <div key={course.id} className="course-card-item">
                                    <div className="course-icon">
                                        <span className="material-symbols-outlined">book</span>
                                    </div>
                                    <div className="course-info-primary">
                                        <h4 className="course-title">{course.name}</h4>
                                        <p className="course-code-line">{course.code} • {course.credits} Cr</p>
                                    </div>
                                    <div className="course-meta-group">
                                        <span className={`status-badge-sm status-${course.status || 'active'}`}>
                                            {course.status || 'Active'}
                                        </span>
                                        <div className="course-actions">
                                            <Link to={`/admin/courses/${course.id}/edit`} className="icon-btn-sm" title="Edit">
                                                <span className="material-symbols-outlined">edit</span>
                                            </Link>
                                            <button
                                                onClick={() => onDelete(course.id)}
                                                className="icon-btn-sm danger"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CourseList = () => {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await axios.get('/api/v1/courses');
            setCourses(res.data.data || []);
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this course?')) return;
        try {
            await axios.delete(`/api/v1/courses/${id}`);
            // Optimistic update
            setCourses(prev => prev.filter(c => c.id !== id));
            alert('Course deleted successfully');
        } catch (error) {
            console.error("Delete error", error);
            alert('Failed to delete course');
        }
    };

    // Stats Logic
    const totalCourses = courses.length;
    const activeCourses = courses.filter(c => c.status === 'active').length;
    // Assuming enrolledStudents comes from API, explicitly checking if it exists
    const totalEnrolled = courses.reduce((sum, c) => sum + (c.enrolledStudents || 0), 0);

    // Grouping Logic
    const groupedCourses = courses.reduce((acc, course) => {
        const deptName = course.department?.name || 'Other Departments';
        if (!acc[deptName]) acc[deptName] = [];
        acc[deptName].push(course);
        return acc;
    }, {});

    const sortedDepts = Object.keys(groupedCourses).sort();

    return (
        <div className="course-list-page">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 className="page-title">Courses</h1>
                    <p className="page-subtitle">Manage academic courses</p>
                </div>
                <Link to="/admin/courses/new" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', background: '#8B5CF6', color: 'white', textDecoration: 'none', borderRadius: '0.75rem', fontWeight: 600 }}>
                    <span className="material-symbols-outlined">add</span>Add Course
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>book</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Courses</p>
                        <h3 className="stat-value">{totalCourses}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#22C55E' }}>task_alt</span>
                    </div>
                    <div>
                        <p className="stat-label">Active</p>
                        <h3 className="stat-value">{activeCourses}</h3>
                    </div>
                </div>
                <div className="card stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(251, 146, 60, 0.1)' }}>
                        <span className="material-symbols-outlined" style={{ color: '#FB923C' }}>groups</span>
                    </div>
                    <div>
                        <p className="stat-label">Total Enrolled</p>
                        <h3 className="stat-value">{totalEnrolled}</h3>
                    </div>
                </div>
            </div>

            {/* Courses Groups */}
            <div id="coursesContainer" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate-500)' }}>Loading courses...</div>
                ) : courses.length === 0 ? (
                    <div className="empty-state">
                        <span className="material-symbols-outlined" style={{ fontSize: '4rem', color: 'var(--slate-300)' }}>book</span>
                        <h3>No Courses Found</h3>
                        <p>Create your first course to get started</p>
                        <Link to="/admin/courses/new" className="btn-primary" style={{ display: 'inline-block', marginTop: '1rem', padding: '0.75rem 1.5rem', background: '#8B5CF6', color: 'white', textDecoration: 'none', borderRadius: '0.75rem' }}>
                            Add Course
                        </Link>
                    </div>
                ) : (
                    sortedDepts.map(deptName => (
                        <DepartmentGroup
                            key={deptName}
                            deptName={deptName}
                            courses={groupedCourses[deptName]}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default CourseList;

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Attendance.css';

const Attendance = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [lectures, setLectures] = useState([]);
    const [selectedLecture, setSelectedLecture] = useState(null);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingLectures, setLoadingLectures] = useState(false);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [newLecture, setNewLecture] = useState({
        lectureNumber: '',
        lectureDate: new Date().toISOString().split('T')[0],
        topic: ''
    });
    const [lectureError, setLectureError] = useState('');

    useEffect(() => {
        loadCourses();
    }, []);

    const loadCourses = async () => {
        try {
            setLoadingCourses(true);
            const res = await axios.get('/api/v1/teachers/offerings');
            // Assuming response structure: { success: true, count: N, data: [...] }
            setCourses(res.data.data || []);
            setLoadingCourses(false);
        } catch (error) {
            console.error('Failed to load courses:', error);
            setLoadingCourses(false);
        }
    };

    const handleCourseSelect = async (course) => {
        setSelectedCourse(course);
        setLoadingLectures(true);
        setSelectedLecture(null);
        try {
            const res = await axios.get(`/api/v1/lectures/offering/${course.id}`);
            // Fix: Access res.data.data or res.data depending on API consistency
            const lectureData = res.data.data || res.data || [];
            setLectures(Array.isArray(lectureData) ? lectureData : []);
            setLoadingLectures(false);
        } catch (error) {
            console.error('Failed to load lectures:', error);
            setLectures([]);
            setLoadingLectures(false);
        }
    };

    const handleAddLectureClick = async () => {
        if (!selectedCourse) {
            alert('Please select a course first');
            return;
        }

        try {
            const res = await axios.get(`/api/v1/lectures/offering/${selectedCourse.id}`);
            const lectureData = res.data.data || res.data || [];
            const currentLectures = Array.isArray(lectureData) ? lectureData : [];
            const existingNumbers = currentLectures.map(l => l.lectureNumber);
            const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;

            setNewLecture({
                lectureNumber: nextNumber,
                lectureDate: new Date().toISOString().split('T')[0],
                topic: ''
            });
            setLectureError('');
            setShowModal(true);
        } catch (error) {
            console.error('Failed to calculate next lecture number:', error);
            setNewLecture({
                lectureNumber: 1,
                lectureDate: new Date().toISOString().split('T')[0],
                topic: ''
            });
            setShowModal(true);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setLectureError('');
    };

    const submitNewLecture = async () => {
        const { lectureNumber, lectureDate, topic } = newLecture;
        const num = parseInt(lectureNumber);

        if (!num || num < 1) {
            setLectureError('Please enter a valid lecture number (minimum 1)');
            return;
        }

        if (Array.isArray(lectures) && lectures.some(l => l.lectureNumber === num)) {
            setLectureError(`Lecture ${num} already exists. Please choose a different number.`);
            return;
        }

        if (!lectureDate) {
            setLectureError('Please select a lecture date');
            return;
        }

        try {
            const payload = {
                offeringId: selectedCourse.id,
                lectureNumber: num,
                topic: topic || null,
                lectureDate: lectureDate
            };

            await axios.post('/api/v1/lectures', payload);

            // Refresh lectures
            const res = await axios.get(`/api/v1/lectures/offering/${selectedCourse.id}`);
            const lectureData = res.data.data || res.data || [];
            setLectures(Array.isArray(lectureData) ? lectureData : []);

            handleModalClose();
        } catch (error) {
            console.error('Failed to add lecture:', error);
            setLectureError('Failed to add lecture. Please try again.');
        }
    };

    const handleDeleteLecture = async (lectureId) => {
        if (!window.confirm('Are you sure you want to delete this lecture? This will also delete all attendance records.')) {
            return;
        }

        try {
            await axios.delete(`/api/v1/lectures/${lectureId}`);
            // Refresh lectures
            const res = await axios.get(`/api/v1/lectures/offering/${selectedCourse.id}`);
            const lectureData = res.data.data || res.data || [];
            setLectures(Array.isArray(lectureData) ? lectureData : []);
            if (selectedLecture === lectureId) setSelectedLecture(null);
            alert('Lecture deleted successfully!');
        } catch (error) {
            console.error('Failed to delete lecture:', error);
            alert('Failed to delete lecture. Please try again.');
        }
    };

    const handleLectureClick = (lecture) => {
        setSelectedLecture(lecture.id);
        // Navigate to marking page (implemented later, adding route now)
        // Using `state` to pass extra info if needed, or just params
        navigate(`/teacher/lectures/${lecture.id}/mark`, {
            state: {
                offeringId: selectedCourse.id,
                lectureNumber: lecture.lectureNumber,
                courseName: `${selectedCourse.courseCode} - ${selectedCourse.courseName}`,
                lectureDate: lecture.lectureDate
            }
        });
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Management</h1>
                    <p className="page-subtitle">Mark attendance for your assigned courses</p>
                </div>
            </div>

            {/* Course Selection */}
            <section style={{ marginBottom: '2rem' }}>
                <div className="section-header">
                    <h2 className="section-title">
                        <span className="material-symbols-outlined">book</span>
                        Select Course
                    </h2>
                </div>
                <div id="coursesList" className="courses-list">
                    {loadingCourses ? (
                        <div className="loading-placeholder">Loading courses...</div>
                    ) : courses.length === 0 ? (
                        <div className="empty-state">
                            <span className="material-symbols-outlined">menu_book</span>
                            <p>No courses assigned to you yet.</p>
                        </div>
                    ) : (
                        courses.map(course => (
                            <div
                                key={course.id}
                                className={`card course-card lecture-card ${selectedCourse?.id === course.id ? 'active' : ''}`}
                                onClick={() => handleCourseSelect(course)}
                            >
                                <div>
                                    <h4 className="course-title">{course.courseCode} - {course.courseName}</h4>
                                    <p className="course-instructor">Section {course.sectionName || 'A'} | {course.semesterName || 'Semester'}</p>
                                </div>
                                <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>chevron_right</span>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Lectures Section */}
            {selectedCourse && (
                <section id="lecturesSection" style={{ marginBottom: '2rem' }}>
                    <div className="section-header">
                        <h2 className="section-title">
                            <span className="material-symbols-outlined">calendar_today</span>
                            Lectures - <span id="selectedCourseName">{selectedCourse.courseCode} - {selectedCourse.courseName}</span>
                        </h2>
                        <button className="add-lecture-btn" onClick={handleAddLectureClick}>
                            <span className="material-symbols-outlined">add</span>
                            Add Lecture
                        </button>
                    </div>
                    <div id="lecturesList" className="courses-list">
                        {loadingLectures ? (
                            <div className="loading-placeholder">Loading lectures...</div>
                        ) : lectures.length === 0 ? (
                            <div className="empty-state">
                                <span className="material-symbols-outlined">event_note</span>
                                <p>No lectures yet. Click "Add Lecture" to create one.</p>
                            </div>
                        ) : (
                            lectures.map(lecture => (
                                <div
                                    key={lecture.id}
                                    className={`lecture-card ${selectedLecture === lecture.id ? 'active' : ''}`}
                                    onClick={() => handleLectureClick(lecture)}
                                >
                                    <div>
                                        <h4 style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Lecture {lecture.lectureNumber}</h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                            {new Date(lecture.lectureDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            {lecture.topic ? ` - ${lecture.topic}` : ''}
                                        </p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <button
                                            className="delete-lecture-btn"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteLecture(lecture.id); }}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>delete</span>
                                            Delete
                                        </button>
                                        <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>chevron_right</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            )}

            {/* Add Lecture Modal */}
            <div className={`modal ${showModal ? 'show' : ''}`} onClick={(e) => e.target.className.includes('modal') && handleModalClose()}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2>Add New Lecture</h2>
                        <button className="modal-close" onClick={handleModalClose}>
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <div className="modal-body">
                        <div className="form-group">
                            <label htmlFor="lectureNumberInput">Lecture Number</label>
                            <input
                                type="number"
                                id="lectureNumberInput"
                                min="1"
                                placeholder="Enter lecture number"
                                value={newLecture.lectureNumber}
                                onChange={(e) => setNewLecture({ ...newLecture, lectureNumber: e.target.value })}
                                required
                            />
                            <span className="error-message" id="lectureNumberError">{lectureError}</span>
                        </div>
                        <div className="form-group">
                            <label htmlFor="lectureDateInput">Lecture Date</label>
                            <input
                                type="date"
                                id="lectureDateInput"
                                value={newLecture.lectureDate}
                                onChange={(e) => setNewLecture({ ...newLecture, lectureDate: e.target.value })}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lectureTopicInput">Topic (Optional)</label>
                            <input
                                type="text"
                                id="lectureTopicInput"
                                placeholder="Enter lecture topic"
                                value={newLecture.topic}
                                onChange={(e) => setNewLecture({ ...newLecture, topic: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button className="btn-cancel" onClick={handleModalClose}>Cancel</button>
                        <button className="btn-submit" onClick={submitNewLecture}>Add Lecture</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Attendance;

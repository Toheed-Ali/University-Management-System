import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getFileVisual } from '../../../components/fileVisual';

const FilePreviewModal = lazy(() => import('../../../components/FilePreviewModal'));

const AssignmentSubmissions = () => {
    const { offeringId, assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [assignmentInfo, setAssignmentInfo] = useState({
        title: location.state?.assignmentTitle || 'Assignment',
        number: location.state?.assignmentNumber || null,
        totalMarks: location.state?.totalMarks || 100,
        courseCode: location.state?.courseCode || '',
        courseName: location.state?.courseName || ''
    });

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [gradingMarks, setGradingMarks] = useState({}); // studentId -> marks
    const [searchTerm, setSearchTerm] = useState('');
    const [plagiarismResults, setPlagiarismResults] = useState(null);
    const [isCheckingPlagiarism, setIsCheckingPlagiarism] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showPlagiarismPane, setShowPlagiarismPane] = useState(false);

    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewFile, setPreviewFile] = useState({ name: '', original: '' });
    const [plagiarismThreshold, setPlagiarismThreshold] = useState(10); // default to 10%
    const filteredMatches = (plagiarismResults?.matches || []).filter(match => match.similarity >= plagiarismThreshold);

    useEffect(() => {
        loadData();
    }, [assignmentId]);

    const loadData = async () => {
        try {
            const res = await axios.get(`/api/v1/assignments/${assignmentId}/submissions`);
            const data = res.data.data || [];
            setStudents(data);
            if (res.data.assignment) {
                setAssignmentInfo({
                    title: res.data.assignment.title,
                    number: res.data.assignment.assignmentNumber,
                    totalMarks: res.data.assignment.totalMarks,
                    courseCode: res.data.assignment.courseCode,
                    courseName: res.data.assignment.courseName
                });
            }

            const restoredPlagiarismResults = res.data.plagiarismResults || null;
            setPlagiarismResults(restoredPlagiarismResults);
            setPlagiarismThreshold(restoredPlagiarismResults?.threshold ?? 10);
            setShowPlagiarismPane(Boolean(restoredPlagiarismResults));

            // Init marks state
            const marksObj = {};
            data.forEach(s => {
                if (s.marksAwarded != null) marksObj[s.studentId] = s.marksAwarded;
            });
            setGradingMarks(marksObj);

            // Select first student if available
            if (data.length > 0 && !selectedStudentId) {
                setSelectedStudentId(data[0].studentId);
            }
        } catch (error) {
            console.error('Failed to load submissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAllMarks = async () => {
        const gradesToSubmit = [];

        students.forEach(student => {
            const marks = gradingMarks[student.studentId];
            // Only submit if marks are entered
            if (marks !== '' && marks !== undefined && !isNaN(marks)) {
                gradesToSubmit.push({
                    studentId: student.studentId,
                    marksAwarded: parseInt(marks)
                });
            }
        });

        if (gradesToSubmit.length === 0) {
            alert('No valid marks entered for submitted assignments.');
            return;
        }

        setIsSaving(true);
        try {
            await axios.post(`/api/v1/assignments/${assignmentId}/bulk-grade`, { grades: gradesToSubmit });

            // Refresh data to show updated statuses
            await loadData();
            alert('All marks submitted successfully!');
        } catch (err) {
            console.error('Failed to submit all marks:', err);
            alert(err.response?.data?.error || 'Failed to submit marks');
        } finally {
            setIsSaving(false);
        }
    };

    const getDisplayName = (fileName) => {
        if (!fileName) return fileName;
        const parts = fileName.split('-');
        return parts.length >= 3 ? parts.slice(2).join('-') : fileName;
    };

    const openPreview = (fileName) => {
        setPreviewFile({ name: fileName, original: getDisplayName(fileName) });
        setPreviewModalOpen(true);
    };

    const filteredStudents = (students || []).filter(s =>
        s.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCheckPlagiarism = async () => {
        setIsCheckingPlagiarism(true);
        try {
            const res = await axios.post(`/api/v1/assignments/${assignmentId}/check-plagiarism`, {
                threshold: plagiarismThreshold
            });
            setPlagiarismResults(res.data.data);
            setShowPlagiarismPane(true);
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to check plagiarism');
        } finally {
            setIsCheckingPlagiarism(false);
        }
    };

    const selectedStudent = (students || []).find(s => s.studentId === selectedStudentId);
    const token = localStorage.getItem('token');

    const getStatusStyles = (status) => {
        switch (status) {
            case 'graded': return { bg: 'rgba(34,197,94,0.1)', text: '#22C55E', label: 'Graded' };
            case 'submitted': return { bg: 'rgba(59,130,246,0.1)', text: '#3B82F6', label: 'Turned In' };
            case 'late': return { bg: 'rgba(239,68,68,0.1)', text: '#EF4444', label: 'Late' };
            case 'missing': return { bg: 'rgba(100,116,139,0.1)', text: 'var(--text-secondary)', label: 'Missing' };
            default: return { bg: 'rgba(100,116,139,0.1)', text: 'var(--text-secondary)', label: status };
        }
    };

    return (
        <div className="submissions-page-wrapper" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', color: 'var(--text-primary)' }}>
            {/* Minimal Header */}
            <div className="header-with-back" style={{ marginBottom: '1.5rem', flexShrink: 0 }}>
                <button className="back-btn-icon" onClick={() => navigate(`/teacher/assignments/${offeringId}`)}>
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="page-title-group">
                    <h1 className="page-title">{assignmentInfo.courseCode ? `${assignmentInfo.courseCode} - ` : ''}{assignmentInfo.courseName || 'Submissions'}</h1>
                    <p className="page-subtitle">
                        {assignmentInfo.number ? `Assignment ${assignmentInfo.number}: ` : ''}{assignmentInfo.title}
                        <span style={{ margin: '0 0.75rem', opacity: 0.3 }}>|</span>
                        Total Marks: {assignmentInfo.totalMarks}
                    </p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={handleCheckPlagiarism}
                        disabled={isCheckingPlagiarism || (students || []).filter(s => s.status !== 'missing').length < 2}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                            background: plagiarismResults ? 'var(--plag-btn-bg)' : 'var(--bg-card)',
                            color: plagiarismResults ? 'var(--plag-btn-text)' : 'var(--text-primary)',
                            border: `2px solid ${plagiarismResults ? 'var(--plag-btn-border)' : 'var(--border-prominent)'}`,
                            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                        }}
                    >
                        <span className="material-symbols-outlined">{isCheckingPlagiarism ? 'sync' : 'fingerprint'}</span>
                        {isCheckingPlagiarism ? 'Checking...' : plagiarismResults ? 'Re-check Plagiarism' : 'Check Plagiarism'}
                    </button>
                    {plagiarismResults && (
                        <button
                            onClick={() => setShowPlagiarismPane(!showPlagiarismPane)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.6rem 1.25rem', borderRadius: '0.75rem',
                                background: 'var(--bg-card)', border: '2px solid var(--border-prominent)',
                                fontWeight: 600, cursor: 'pointer'
                            }}
                        >
                            <span className="material-symbols-outlined">{showPlagiarismPane ? 'visibility_off' : 'visibility'}</span>
                            {filteredMatches.length} Matches
                        </button>
                    )}
                    <button
                        onClick={handleSubmitAllMarks}
                        disabled={isSaving || students.length === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.6rem 1.5rem', borderRadius: '0.75rem',
                            background: 'var(--primary)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(var(--primary-rgb, 26, 115, 232), 0.3)'
                        }}
                        onMouseEnter={(e) => !isSaving && (e.currentTarget.style.opacity = '0.9')}
                        onMouseLeave={(e) => !isSaving && (e.currentTarget.style.opacity = '1')}
                    >
                        {isSaving ? 'Returning...' : 'Return Marks'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-placeholder">Loading submissions...</div>
            ) : (
                <div className="split-pane-container" style={{ display: 'flex', flex: 1, gap: '1.5rem', overflow: 'hidden' }}>

                    {/* Left Pane: Student List */}
                    <div className="left-pane card" style={{ width: '336px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '2px solid var(--border-prominent)' }}>
                        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>Students ({filteredStudents.length})</h3>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {(students || []).filter(s => s.status !== 'missing').length} Submitted
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="search-bar-premium" style={{ position: 'relative', border: '2px solid var(--border-prominent)', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                <span className="material-symbols-outlined" style={{
                                    position: 'absolute', left: '9.6px', top: '50%', transform: 'translateY(-50%)',
                                    fontSize: '1.2rem', color: 'var(--text-secondary)', pointerEvents: 'none'
                                }}>search</span>
                                <input
                                    type="text"
                                    placeholder="Search by name or roll number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem',
                                        borderRadius: '0.75rem', border: 'none',
                                        background: 'transparent', color: 'var(--text-primary)',
                                        fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s'
                                    }}
                                />
                                {searchTerm && (
                                    <span
                                        className="material-symbols-outlined"
                                        onClick={() => setSearchTerm('')}
                                        style={{
                                            position: 'absolute', right: '9.6px', top: '50%', transform: 'translateY(-50%)',
                                            fontSize: '1.2rem', color: 'var(--text-secondary)', cursor: 'pointer'
                                        }}
                                    >close</span>
                                )}
                            </div>
                        </div>

                        <div className="student-list-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                            {filteredStudents.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                    No students found matching "{searchTerm}"
                                </div>
                            ) : (
                                filteredStudents.map(s => {
                                    const styles = getStatusStyles(s.status);
                                    const isActive = selectedStudentId === s.studentId;
                                    return (
                                        <div
                                            key={s.studentId}
                                            onClick={() => setSelectedStudentId(s.studentId)}
                                            className={`student-list-item ${isActive ? 'active' : ''}`}
                                            style={{
                                                padding: '1rem',
                                                borderRadius: '0.75rem',
                                                cursor: 'pointer',
                                                marginBottom: '0.5rem',
                                                transition: 'all 0.2s ease',
                                                background: isActive ? 'var(--bg-hover)' : 'transparent',
                                                border: isActive ? '2px solid var(--primary)' : '2px solid var(--border-prominent)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ flex: 1, minWidth: 0, marginRight: '1rem' }}>
                                                    <div style={{ fontWeight: 600, color: isActive ? 'var(--primary)' : 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.studentName}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.rollNumber}</div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                                                    <span style={{
                                                        padding: '3px 10px', borderRadius: '9.6px', fontSize: '0.7rem', fontWeight: 600,
                                                        background: styles.bg, color: styles.text, textTransform: 'uppercase'
                                                    }}>
                                                        {styles.label}
                                                    </span>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-body)', padding: '0.2rem 0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-prominent)' }}>
                                                        <input
                                                            type="number"
                                                            placeholder="Marks"
                                                            value={gradingMarks[s.studentId] ?? ''}
                                                            onChange={(e) => setGradingMarks(prev => ({ ...prev, [s.studentId]: e.target.value }))}
                                                            onClick={(e) => e.stopPropagation()}
                                                            title={`Enter marks (0-${assignmentInfo.totalMarks})`}
                                                            style={{ width: '32px', border: 'none', background: 'transparent', textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}
                                                        />
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7 }}>/ {assignmentInfo.totalMarks}</span>
                                                        {s.marksAwarded != null && (
                                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem', color: '#22C55E' }}>check_circle</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Detailed View or Plagiarism View */}
                    <div className="right-pane card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '2px solid var(--border-prominent)' }}>
                        {showPlagiarismPane && plagiarismResults ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ padding: '1.5rem 2rem', borderBottom: '2px solid var(--plag-panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--plag-panel-bg)' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--plag-title)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <span className="material-symbols-outlined">gpp_maybe</span>
                                            Plagiarism Analysis
                                        </h2>
                                        <p style={{ margin: '0.25rem 0 0', color: 'var(--plag-text)' }}>Found {filteredMatches.length} student pairs with high similarity.</p>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <label htmlFor="plagiarism-threshold-select" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--plag-title)' }}>Threshold:</label>
                                            <select
                                                id="plagiarism-threshold-select"
                                                value={plagiarismThreshold}
                                                onChange={(e) => setPlagiarismThreshold(Number(e.target.value))}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.5rem',
                                                    border: '2px solid var(--plag-select-border)',
                                                    background: 'var(--plag-select-bg)',
                                                    color: 'var(--plag-select-text)',
                                                    fontWeight: 600,
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: '0.85rem'
                                                }}
                                            >
                                                <option value={10}>Above 10%</option>
                                                <option value={20}>Above 20%</option>
                                                <option value={30}>Above 30%</option>
                                                <option value={40}>Above 40%</option>
                                                <option value={50}>Above 50%</option>
                                                <option value={60}>Above 60%</option>
                                                <option value={70}>Above 70%</option>
                                                <option value={80}>Above 80%</option>
                                                <option value={90}>Above 90%</option>
                                            </select>
                                        </div>
                                        {plagiarismResults.reportUrl && plagiarismResults.reportUrl !== 'local' && (
                                            <a
                                                href={plagiarismResults.reportUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                    padding: '0.5rem 1rem', borderRadius: '0.5rem',
                                                    background: 'var(--plag-report-bg)', color: 'white',
                                                    textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600,
                                                    transition: 'opacity 0.2s', boxShadow: 'var(--plag-report-shadow)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>open_in_new</span>
                                                MOSS Report
                                            </a>
                                        )}
                                        <button onClick={() => setShowPlagiarismPane(false)} className="material-symbols-outlined" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--plag-title)' }}>close</button>
                                    </div>
                                </div>
                                <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                                    {(!filteredMatches || filteredMatches.length === 0) ? (
                                        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem', color: 'var(--primary)' }}>verified_user</span>
                                            <p>No matches found matching the selected similarity threshold.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'grid', gap: '1rem' }}>
                                            {filteredMatches.map((match, i) => (
                                                <div key={i} style={{
                                                    padding: '1.25rem', borderRadius: '1rem',
                                                    background: match.similarity > 50 ? 'var(--plag-match-high-bg)' : 'var(--plag-match-mid-bg)',
                                                    border: `1px solid ${match.similarity > 50 ? 'var(--plag-match-high-border)' : 'var(--plag-match-mid-border)'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
                                                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                                                            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: match.similarity > 50 ? '#E11D48' : '#EA580C' }}>{match.similarity}%</div>
                                                            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>Match</div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                                            <div style={{ background: 'var(--plag-match-student-bg)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, border: '1px solid var(--border-color)', flex: 1, textAlign: 'center' }}>{match.student1}</div>
                                                            <span className="material-symbols-outlined" style={{ opacity: 0.3 }}>compare_arrows</span>
                                                            <div style={{ background: 'var(--plag-match-student-bg)', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: 600, border: '1px solid var(--border-color)', flex: 1, textAlign: 'center' }}>{match.student2}</div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedStudentId(students.find(s => s.rollNumber === match.student1)?.studentId);
                                                            setShowPlagiarismPane(false);
                                                        }}
                                                        style={{ marginLeft: '1.5rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', background: 'var(--primary)', color: 'white', cursor: 'pointer', fontWeight: 500 }}
                                                    >
                                                        Review Student 1
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : selectedStudent ? (
                            <>
                                <div style={{ padding: '2rem', borderBottom: '2px solid var(--border-prominent)', background: 'linear-gradient(to right, var(--bg-card), var(--bg-hover))' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: '1.75rem', color: 'var(--text-primary)' }}>{selectedStudent.studentName}</h2>
                                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '1rem' }}>{selectedStudent.rollNumber}</p>
                                        </div>
                                        {selectedStudent.status !== 'missing' && (
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Submitted On</div>
                                                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{new Date(selectedStudent.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
                                    {selectedStudent.status === 'missing' ? (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.6 }}>
                                            <span className="material-symbols-outlined" style={{ fontSize: '4rem', marginBottom: '1rem' }}>person_off</span>
                                            <p>No submission found for this student.</p>
                                        </div>
                                    ) : (
                                        <div className="submission-details">
                                            <h4 style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                                                <span className="material-symbols-outlined">attach_file</span>
                                                Submitted Files
                                            </h4>

                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                                {(Array.isArray(selectedStudent.submissionFile) ? selectedStudent.submissionFile : [selectedStudent.submissionFile]).map((file, idx) => {
                                                    const { icon, color } = getFileVisual(file);
                                                    return (
                                                        <div key={idx} className="file-card-premium" style={{
                                                            padding: '1.25rem',
                                                            borderRadius: '1rem',
                                                            background: 'var(--bg-body)',
                                                            border: '2px solid var(--border-prominent)',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '1rem',
                                                            transition: 'transform 0.2s'
                                                        }}>
                                                            <div style={{ width: '38.4px', height: '38.4px', borderRadius: '0.75rem', background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <span className="material-symbols-outlined" style={{ color: color, fontSize: '1.75rem' }}>{icon}</span>
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>
                                                                    {getDisplayName(file)}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                                    <button
                                                                        onClick={() => openPreview(file)}
                                                                        className="btn-tiny"
                                                                        style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4.8px', background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
                                                                    >
                                                                        Preview
                                                                    </button>
                                                                    <a
                                                                        href={`/api/v1/submissions/${encodeURIComponent(file)}/download?token=${token}`}
                                                                        className="btn-tiny"
                                                                        style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: '4.8px', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}
                                                                    >
                                                                        Download
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Instructions for teacher */}
                                            <div style={{ marginTop: '3rem', padding: '1.5rem', borderRadius: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px dashed #3B82F6', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                                <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span className="material-symbols-outlined" style={{ color: '#3B82F6' }}>info</span>
                                                    To grade this assignment, enter marks for all students in the left list and click "Submit All Marks" at the top.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>group</span>
                                <p style={{ fontSize: '1.1rem' }}>Select a student from the list to view their submission</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {previewModalOpen && (
                <Suspense fallback={null}>
                    <FilePreviewModal
                        isOpen={previewModalOpen}
                        onClose={() => setPreviewModalOpen(false)}
                        fileName={previewFile.name}
                        originalName={previewFile.original}
                    />
                </Suspense>
            )}

            <style>{`
                .student-list-item:hover {
                    box-shadow: 0 0 12px rgba(0,0,0,0.1);
                }
                .student-list-item.active {
                    box-shadow: 0 0 20px rgba(var(--primary-rgb, 26, 115, 232), 0.25);
                }
                .file-card-premium:hover {
                    box-shadow: 0 0 15px rgba(0,0,0,0.15);
                    border-color: var(--primary);
                }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                .submissions-page-wrapper {
                    --plag-btn-bg: #fff1f2;
                    --plag-btn-text: #dc2626;
                    --plag-btn-border: #fca5a5;
                    --plag-panel-bg: #fff1f2;
                    --plag-panel-border: #fecdd3;
                    --plag-title: #b91c1c;
                    --plag-text: #991b1b;
                    --plag-select-bg: #ffffff;
                    --plag-select-text: #b91c1c;
                    --plag-select-border: #fca5a5;
                    --plag-report-bg: #b91c1c;
                    --plag-report-shadow: 0 2px 4px rgba(185, 28, 28, 0.2);
                    --plag-match-high-bg: #fff1f2;
                    --plag-match-high-border: #fecdd3;
                    --plag-match-mid-bg: #fff7ed;
                    --plag-match-mid-border: #fed7aa;
                    --plag-match-student-bg: #ffffff;
                    --border-prominent: rgba(0, 0, 0, 0.15);
                }
                .dark .submissions-page-wrapper {
                    --plag-btn-bg: rgba(127, 29, 29, 0.28);
                    --plag-btn-text: #fecaca;
                    --plag-btn-border: rgba(248, 113, 113, 0.45);
                    --plag-panel-bg: rgba(127, 29, 29, 0.16);
                    --plag-panel-border: rgba(248, 113, 113, 0.25);
                    --plag-title: #fca5a5;
                    --plag-text: #fecaca;
                    --plag-select-bg: rgba(24, 24, 27, 0.92);
                    --plag-select-text: #fecaca;
                    --plag-select-border: rgba(248, 113, 113, 0.4);
                    --plag-report-bg: #dc2626;
                    --plag-report-shadow: 0 6px 14px rgba(0, 0, 0, 0.25);
                    --plag-match-high-bg: rgba(127, 29, 29, 0.18);
                    --plag-match-high-border: rgba(248, 113, 113, 0.3);
                    --plag-match-mid-bg: rgba(120, 53, 15, 0.16);
                    --plag-match-mid-border: rgba(251, 146, 60, 0.28);
                    --plag-match-student-bg: rgba(24, 24, 27, 0.9);
                    --border-prominent: #2e2e2eff;
                }
                .card.left-pane, .card.right-pane {
                    box-shadow: 0 0 15px rgba(0,0,0,0.1) !important;
                }
                .card.left-pane, .card.right-pane, .student-list-item, .search-bar-premium, .file-card-premium {
                    /* Redundant but kept for safety */
                    border-color: var(--border-prominent) !important;
                }
                .search-bar-premium:focus-within {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 26, 115, 232), 0.1);
                }
            `}</style>
        </div>
    );
};

export default AssignmentSubmissions;

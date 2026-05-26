import { lazy, Suspense, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { getFileVisual } from '../../../components/fileVisual';
import './StudentAssignments.css';

const FilePreviewModal = lazy(() => import('../../../components/FilePreviewModal'));

const AssignmentDetail = () => {
    const { offeringId, assignmentId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [assignment, setAssignment] = useState(location.state?.assignment || {});
    const courseName = location.state?.courseName || '';
    const courseCode = location.state?.courseCode || '';

    const [uploading, setUploading] = useState(false);
    const [submitted, setSubmitted] = useState(
        assignment.submitted || (assignment.submission ? assignment.submission.status !== 'draft' : false)
    );
    const [submission, setSubmission] = useState(assignment.submission || null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(!assignment.title);

    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [previewFileName, setPreviewFileName] = useState('');
    const [previewOriginalName, setPreviewOriginalName] = useState('');

    const isPast = assignment.dueDate ? new Date(assignment.dueDate) < new Date() : false;
    const isGraded = submission?.status === 'graded';

    useEffect(() => {
        fetchAssignment();
    }, [assignmentId]);

    const fetchAssignment = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/api/v1/assignments/${assignmentId}`);
            const data = res.data.data;
            setAssignment(data);
            setSubmission(data.submission || null);
            setSubmitted(data.submitted || false);
            // Update history state but don't let it block future fetches
            window.history.replaceState({ ...location.state, assignment: data }, '');
        } catch (err) {
            setError('Failed to load assignment details');
        } finally {
            setLoading(false);
        }
    };

    // Helper: extract display name from stored filename
    const getDisplayName = (fileName) => {
        if (!fileName) return fileName;
        const parts = fileName.split('-');
        return parts.length >= 3 ? parts.slice(2).join('-') : fileName;
    };

    // Helper: open preview modal
    const openPreview = (fileName) => {
        setPreviewFileName(fileName);
        setPreviewOriginalName(getDisplayName(fileName));
        setPreviewModalOpen(true);
    };

    const handleSubmit = async () => {
        if (!submission || !submission.submissionFile || submission.submissionFile.length === 0) {
            setError('Please select at least one file to upload');
            return;
        }
        setError('');
        setUploading(true);
        try {
            const res = await axios.post(`/api/v1/assignments/${assignmentId}/submit`);
            setSubmitted(true);
            setSubmission(res.data.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit assignment');
        } finally {
            setUploading(false);
        }
    };

    const handleUnsubmit = async () => {
        if (!submission) return;
        try {
            setUploading(true);
            setError('');
            await axios.delete(`/api/v1/assignments/submissions/${submission.id}/unsubmit`);
            setSubmitted(false);
            setSubmission(prev => ({ ...prev, status: 'draft' }));
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to unsubmit assignment');
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = async (fileName) => {
        try {
            setUploading(true);
            setError('');
            const res = await axios.delete(`/api/v1/assignments/${assignmentId}/draft/${encodeURIComponent(fileName)}`);
            setSubmission(res.data.data);
        } catch (err) {
            setError('Failed to remove attachment');
        } finally {
            setUploading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const newFiles = Array.from(e.target.files);
        if (newFiles.length === 0) return;

        // Check for duplicates before uploading
        const existingFiles = submission?.submissionFile || [];
        const existingNames = existingFiles.map(f => getDisplayName(f).toLowerCase());

        for (const file of newFiles) {
            if (existingNames.includes(file.name.toLowerCase())) {
                setError(`File "${file.name}" is already attached`);
                e.target.value = '';
                return;
            }
        }

        setUploading(true);
        setError('');
        const formData = new FormData();
        newFiles.forEach(f => formData.append('files', f));

        try {
            // Let the browser/axios set the Content-Type (with boundary) automatically
            const res = await axios.post(`/api/v1/assignments/${assignmentId}/draft`, formData);
            setSubmission(res.data.data);
        } catch (err) {
            if (err.response?.status === 409) {
                setError('This assignment has already been submitted');
                setSubmitted(true);
            } else if (err.response?.status === 413) {
                setError(err.response?.data?.error || 'One or more files are too large');
            } else {
                setError(err.response?.data?.error || 'Failed to upload draft files');
            }
        } finally {
            setUploading(false);
            // Reset file input so same file can be re-selected if needed
            e.target.value = '';
        }
    };



    if (loading) {
        return (
            <div>
                <div className="header-with-back">
                    <button
                        className="back-btn-icon"
                        onClick={() => navigate(`/student/assignments/${offeringId}`, { state: { courseName, courseCode } })}
                    >
                        <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                    </button>
                    <div className="page-title-group">
                        <h1 className="page-title">
                            {courseCode} - {courseName}
                        </h1>
                        <p className="page-subtitle">Loading assignment...</p>
                    </div>
                </div>
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-500)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'inline-block' }}>sync</span>
                    <p>Loading assignment content...</p>
                </div>
            </div>
        );
    }


    const token = localStorage.getItem('token');

    return (
        <div>
            <div className="header-with-back">
                <button
                    className="back-btn-icon"
                    onClick={() => navigate(`/student/assignments/${offeringId}`, { state: { courseName, courseCode } })}
                >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.75rem' }}>arrow_back</span>
                </button>
                <div className="page-title-group">
                    <h1 className="page-title">
                        {assignment.assignmentNumber != null ? `Assignment ${assignment.assignmentNumber} - ` : ''}
                        {assignment.course?.name || courseName}
                    </h1>
                </div>
            </div>

            <div className="assignment-detail-container">

                {/* Left Column: Assignment Info */}
                <div className="assignment-detail-left">
                    <div>
                        <div className="assignment-gc-header">
                            <h2 className="assignment-gc-title">
                                <span className="material-symbols-outlined assignment-gc-icon">assignment</span>
                                {assignment.title || 'Assignment'}
                            </h2>
                        </div>

                        <div className="assignment-gc-subtitle">
                            Posted {new Date(assignment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {assignment.updatedAt && new Date(assignment.updatedAt) - new Date(assignment.createdAt) > 60000 && (
                                <span style={{ marginLeft: '8px' }}>
                                    (Edited {new Date(assignment.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                                </span>
                            )}
                        </div>

                        <div className="assignment-gc-meta">
                            {isGraded ? (
                                <span style={{ color: '#16A34A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3.2px' }}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem' }}>verified</span>
                                    {submission.marksAwarded} / {assignment.totalMarks} points
                                </span>
                            ) : (
                                <span>{assignment.totalMarks} points</span>
                            )}
                            <span>
                                Due {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })},{' '}
                                {new Date(assignment.dueDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        <div className="assignment-gc-content">
                            {assignment.description || 'No additional details provided for this assignment.'}
                        </div>
                    </div>
                </div>

                {/* Right Column: Submission Card */}
                <div className="assignment-detail-right">
                    <div className="assignment-detail-card" style={{ padding: '1.25rem' }}>

                        {/* Card Header */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginBottom: '1.25rem'
                        }}>
                            <h3 className="assignment-gc-card-title">Your work</h3>
                            <span style={{
                                fontSize: '0.875rem', fontWeight: 500,
                                color: isGraded ? '#16A34A'
                                    : submitted ? '#16A34A'
                                        : isPast ? '#DC2626'
                                            : 'var(--slate-500)'
                            }}>
                                {isGraded ? 'Graded'
                                    : submitted ? 'Turned in'
                                        : isPast ? 'Missing'
                                            : 'Assigned'}
                            </span>
                        </div>

                        {/* ── Submitted / Graded state ── */}
                        {(submitted || isGraded) ? (
                            <div className="submission-success">

                                {/* File list */}
                                {submission?.submissionFile &&
                                    Array.isArray(submission.submissionFile) &&
                                    submission.submissionFile.length > 0 ? (
                                    submission.submissionFile.map((fileName, index) => {
                                        const downloadUrl = token
                                            ? `/api/v1/submissions/${fileName}/download?token=${encodeURIComponent(token)}`
                                            : '';
                                        const { icon, color, label: fileDesc } = getFileVisual(fileName);

                                        return (
                                            <div
                                                key={index}
                                                onClick={() => openPreview(fileName)}
                                                style={{ cursor: 'pointer', display: 'block', textDecoration: 'none' }}
                                            >
                                                <div
                                                    style={{
                                                        border: '2px solid var(--border-color)',
                                                        borderRadius: '0.5rem',
                                                        display: 'flex',
                                                        alignItems: 'stretch',
                                                        marginBottom: '0.5rem',
                                                        transition: 'background 0.2s',
                                                        overflow: 'hidden',
                                                        height: '3.75rem',
                                                        backgroundColor: 'var(--bg-card, white)'
                                                    }}
                                                    onMouseEnter={e => {
                                                        e.currentTarget.style.backgroundColor = 'rgba(100,100,100,0.05)';
                                                        e.currentTarget.querySelector('.fileNameText').style.textDecoration = 'underline';
                                                    }}
                                                    onMouseLeave={e => {
                                                        e.currentTarget.style.backgroundColor = 'var(--bg-card, white)';
                                                        e.currentTarget.querySelector('.fileNameText').style.textDecoration = 'none';
                                                    }}
                                                >
                                                    <div style={{
                                                        flex: 1, padding: '0.5rem 0.75rem',
                                                        display: 'flex', flexDirection: 'column',
                                                        justifyContent: 'center', overflow: 'hidden'
                                                    }}>
                                                        <p
                                                            className="fileNameText"
                                                            style={{
                                                                margin: 0, fontWeight: 500,
                                                                color: 'var(--slate-800, #3c4043)',
                                                                whiteSpace: 'nowrap', overflow: 'hidden',
                                                                textOverflow: 'ellipsis', fontSize: '0.875rem'
                                                            }}
                                                        >
                                                            {getDisplayName(fileName)}
                                                        </p>
                                                        <p style={{
                                                            margin: 0, color: 'var(--slate-500, #5f6368)',
                                                            fontSize: '0.75rem', marginTop: '0.125rem'
                                                        }}>
                                                            {fileDesc}
                                                        </p>
                                                    </div>
                                                    <div style={{
                                                        width: '3.75rem',
                                                        borderLeft: '1px solid var(--border-color)',
                                                        display: 'flex', alignItems: 'center',
                                                        justifyContent: 'center', flexShrink: 0,
                                                        background: 'rgba(100,100,100,0.02)'
                                                    }}>
                                                        <a
                                                            href={downloadUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Download"
                                                            onClick={e => e.stopPropagation()}
                                                            style={{
                                                                display: 'flex', alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: '100%', height: '100%',
                                                                textDecoration: 'none'
                                                            }}
                                                        >
                                                            <span
                                                                className="material-symbols-outlined"
                                                                style={{ fontSize: '2rem', color }}
                                                            >
                                                                {icon}
                                                            </span>
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="submission-success-icon" style={{
                                        background: isGraded ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.1)',
                                        width: '3rem', height: '3rem', margin: '0 auto 1rem',
                                        borderRadius: '50%', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <span className="material-symbols-outlined" style={{
                                            fontSize: '1.5rem',
                                            color: isGraded ? '#22C55E' : '#3B82F6'
                                        }}>
                                            {isGraded ? 'check_circle' : 'cloud_done'}
                                        </span>
                                    </div>
                                )}

                                {/* Grade display removed as per user request */}

                                {/* Unsubmit button */}
                                <button
                                    onClick={handleUnsubmit}
                                    disabled={uploading}
                                    style={{
                                        background: 'transparent',
                                        color: 'var(--primary, #1a73e8)',
                                        border: '2px solid var(--border-color)',
                                        marginTop: '0.5rem', width: '100%',
                                        padding: '0.5rem 1rem', borderRadius: '2rem',
                                        fontWeight: 500, fontSize: '0.875rem',
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s', display: 'flex',
                                        justifyContent: 'center', alignItems: 'center'
                                    }}
                                    onMouseEnter={e => { if (!uploading) e.currentTarget.style.backgroundColor = 'rgba(26,115,232,0.04)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                >
                                    {uploading ? 'Unsubmitting...' : 'Unsubmit'}
                                </button>
                            </div>

                        ) : (
                            /* ── Draft / Not submitted state ── */
                            <div>
                                {isPast && (
                                    <div style={{
                                        color: '#DC2626', fontSize: '0.8125rem',
                                        marginBottom: '1rem', fontStyle: 'italic'
                                    }}>
                                        Work cannot be turned in after the due date.
                                    </div>
                                )}

                                {/* Draft files list */}
                                {submission?.submissionFile &&
                                    Array.isArray(submission.submissionFile) &&
                                    submission.submissionFile.length > 0 && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            {submission.submissionFile.map((fileName, idx) => {
                                                const { icon, color } = getFileVisual(fileName);
                                                return (
                                                    <div
                                                        key={idx}
                                                        style={{
                                                            border: '2px solid var(--border-color)',
                                                            borderRadius: '0.5rem',
                                                            padding: '0.5rem 0.75rem',
                                                            display: 'flex', alignItems: 'center',
                                                            gap: '0.5rem', marginBottom: '0.5rem'
                                                        }}
                                                    >
                                                        <span className="material-symbols-outlined" style={{
                                                            fontSize: '1.25rem', color, flexShrink: 0
                                                        }}>
                                                            {icon}
                                                        </span>
                                                        <span
                                                            style={{
                                                                flex: 1, overflow: 'hidden',
                                                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                                fontSize: '0.875rem', fontWeight: 500,
                                                                cursor: 'pointer', color: 'var(--primary, #1a73e8)'
                                                            }}
                                                            onClick={() => openPreview(fileName)}
                                                        >
                                                            {getDisplayName(fileName)}
                                                        </span>
                                                        <button
                                                            onClick={() => handleRemoveFile(fileName)}
                                                            disabled={uploading}
                                                            style={{
                                                                background: 'none', border: 'none',
                                                                cursor: uploading ? 'not-allowed' : 'pointer',
                                                                color: 'var(--slate-500)',
                                                                display: 'flex', padding: '0.25rem',
                                                                flexShrink: 0
                                                            }}
                                                            title="Remove file"
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '1rem' }}>
                                                                close
                                                            </span>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                {/* File upload button */}
                                <label 
                                    htmlFor="file-upload-input" 
                                    className="upload-dropzone" 
                                    style={{ 
                                        cursor: uploading ? 'not-allowed' : 'pointer',
                                        display: 'block',
                                        marginBottom: '1rem'
                                    }}
                                >
                                    <div className="upload-btn">
                                        <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>add</span>
                                        {uploading ? 'Uploading...' : 'Add or create'}
                                    </div>
                                    <input
                                        id="file-upload-input"
                                        type="file"
                                        multiple
                                        onChange={handleFileUpload}
                                        disabled={uploading}
                                        style={{ display: 'none' }}
                                    />
                                </label>

                                {error && (
                                    <p style={{
                                        color: '#DC2626', fontSize: '0.875rem',
                                        marginBottom: '0.75rem', textAlign: 'center'
                                    }}>
                                        {error}
                                    </p>
                                )}

                                <button
                                    className="submit-btn"
                                    onClick={handleSubmit}
                                    disabled={
                                        uploading ||
                                        !submission?.submissionFile ||
                                        submission.submissionFile.length === 0
                                    }
                                >
                                    {uploading ? 'Turning in...' : 'Mark as done'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previewModalOpen && (
                <Suspense fallback={null}>
                    <FilePreviewModal
                        isOpen={previewModalOpen}
                        onClose={() => setPreviewModalOpen(false)}
                        fileName={previewFileName}
                        originalName={previewOriginalName}
                    />
                </Suspense>
            )}
        </div>
    );
};

export default AssignmentDetail;
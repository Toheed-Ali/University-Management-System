import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Dashboard.css';

const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [offerings, setOfferings] = useState([]);
    const [stats, setStats] = useState({
        totalCourses: 0,
        totalStudents: 0,
        pendingResults: '---',
        pendingAssignments: '---'
    });
    const [loading, setLoading] = useState(true);
    const [dismissedAlerts, setDismissedAlerts] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch offerings
            const offeringsResponse = await axios.get('/api/v1/teachers/offerings');
            const offeringsData = offeringsResponse.data.data; // data.data because API returns { success: true, data: [...] }

            // Fetch stats from newly created endpoint
            const statsResponse = await axios.get('/api/v1/teachers/dashboard-stats');
            const statsData = statsResponse.data.data;

            // Fetch Notifications
            let recentlyApproved = [];
            try {
                const notifRes = await axios.get('/api/v1/teachers/notifications');
                recentlyApproved = notifRes.data.data.recentlyApproved || [];
            } catch (e) {
                console.error('Failed to fetch notifications', e);
            }

            setOfferings(offeringsData || []);
            setStats({
                ...statsData,
                recentlyApproved
            });

            setLoading(false);
        } catch (err) {
            console.error('Dashboard error:', err);
            setLoading(false);
        }
    };

    const handleViewDetails = (e, offeringId) => {
        e.stopPropagation();
        navigate(`/teacher/courses/${offeringId}/students`);
    };

    const handleCardClick = (offeringId) => {
        navigate(`/teacher/courses/${offeringId}/students`);
    };

    const handleDismissAlert = (e, offeringId) => {
        e.stopPropagation();
        setDismissedAlerts(prev => [...prev, offeringId]);
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Welcome back, <span className="user-first-name">{user?.firstName || 'Teacher'}</span>!</h1>
                    <p className="page-subtitle">Here's an overview of your assigned courses</p>
                </div>
            </div>

            {/* Notifications Area */}
            {stats.recentlyApproved && stats.recentlyApproved.filter(a => !dismissedAlerts.includes(a.id)).length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                    {stats.recentlyApproved.filter(a => !dismissedAlerts.includes(a.id)).map((offering) => (
                        <div key={offering.id} style={{
                            padding: '1rem',
                            backgroundColor: '#F0FDF4', // green-50
                            border: '1px solid #BBF7D0', // green-200
                            borderRadius: '0.5rem',
                            color: '#15803D', // green-700
                            marginBottom: '0.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <span className="material-symbols-outlined">check_circle</span>
                                <div>
                                    <strong>Grades Approved:</strong> The results for <strong>{offering.course?.name} ({offering.course?.code})</strong> - Section {offering.section?.name} have been approved.
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDismissAlert(e, offering.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#15803D',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '0.25rem',
                                    borderRadius: '50%',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#DCFCE7'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>close</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Grid */}
            <section className="stats-grid">
                <div className="card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 122.88 101.37" width="20" height="20" fill="var(--primary)">
                            <path d="M12.64,77.27l0.31-54.92h-6.2v69.88c8.52-2.2,17.07-3.6,25.68-3.66c7.95-0.05,15.9,1.06,23.87,3.76 c-4.95-4.01-10.47-6.96-16.36-8.88c-7.42-2.42-15.44-3.22-23.66-2.52c-1.86,0.15-3.48-1.23-3.64-3.08 C12.62,77.65,12.62,77.46,12.64,77.27L12.64,77.27z M103.62,19.48c-0.02-0.16-0.04-0.33-0.04-0.51c0-0.17,0.01-0.34,0.04-0.51V7.34 c-7.8-0.74-15.84,0.12-22.86,2.78c-6.56,2.49-12.22,6.58-15.9,12.44V85.9c5.72-3.82,11.57-6.96,17.58-9.1 c6.85-2.44,13.89-3.6,21.18-3.02V19.48L103.62,19.48z M110.37,15.6h9.14c1.86,0,3.37,1.51,3.37,3.37v77.66 c0,1.86-1.51,3.37-3.37,3.37c-0.38,0-0.75-0.06-1.09-0.18c-9.4-2.69-18.74-4.48-27.99-4.54c-9.02-0.06-18.03,1.53-27.08,5.52 c-0.56,0.37-1.23,0.57-1.92,0.56c-0.68,0.01-1.35-0.19-1.92-0.56c-9.04-4-18.06-5.58-27.08-5.52c-9.25,0.06-18.58,1.85-27.99,4.54 c-0.34,0.12-0.71,0.18-1.09,0.18C1.51,100.01,0,98.5,0,96.64V18.97c0-1.86,1.51-3.37,3.37-3.37h9.61l0.06-11.26 c0.01-1.62,1.15-2.96,2.68-3.28l0,0c8.87-1.85,19.65-1.39,29.1,2.23c6.53,2.5,12.46,6.49,16.79,12.25 c4.37-5.37,10.21-9.23,16.78-11.72c8.98-3.41,19.34-4.23,29.09-2.8c1.68,0.24,2.88,1.69,2.88,3.33h0V15.6L110.37,15.6z M68.13,91.82c7.45-2.34,14.89-3.3,22.33-3.26c8.61,0.05,17.16,1.46,25.68,3.66V22.35h-5.77v55.22c0,1.86-1.51,3.37-3.37,3.37 c-0.27,0-0.53-0.03-0.78-0.09c-7.38-1.16-14.53-0.2-21.51,2.29C79.09,85.15,73.57,88.15,68.13,91.82L68.13,91.82z M58.12,85.25 V22.46c-3.53-6.23-9.24-10.4-15.69-12.87c-7.31-2.8-15.52-3.43-22.68-2.41l-0.38,66.81c7.81-0.28,15.45,0.71,22.64,3.06 C47.73,78.91,53.15,81.64,58.12,85.25L58.12,85.25z" />
                        </svg>
                    </div>
                    <div className="stat-content-flex">
                        <p className="stat-label">Assigned Courses</p>
                        <h3 className="stat-value" id="totalCourses">{stats.totalCourses}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 89.28 122.88" width="20" height="20" fill="var(--primary)">
                            <g>
                                <path fillRule="evenodd" clipRule="evenodd" d="M2.86,82.1h9.65c3.1-4.81,9.75-7.32,15.7-9.57c1.47-0.56,2.9-1.09,4.2-1.64c0.69-0.91,1.25-1.88,1.69-2.93 c0.38-0.9,0.66-1.85,0.85-2.85c-1.06-0.63-2.08-1.38-3.05-2.24c-3.95-3.5-6.71-6.36-8.49-9.67c-1.81-3.36-2.56-7.08-2.46-12.26 l0.28-11.86c0-0.17,0.03-0.32,0.08-0.47l-3.49-1.2C17.32,16.04,23.72,9.22,31.63,5.79c2.89-1.25-1.95-7.55,4.69-5.32 c8.87,2.97,28.53,6.84,33.19,12.2c3.79,4.36,3.94,6.75,3.85,12.49c-0.03,1.86-0.32,3.5-1.21,4.1c-0.41,0.27-0.9,0.37-1.46,0.31 v12.46c0,7.1-2.54,13.03-6.44,17.43c-2.2,2.48-4.82,4.46-7.67,5.89c0.17,0.91,0.41,1.79,0.71,2.62c0.35,0.97,0.8,1.9,1.33,2.78 c1.14,0.51,2.27,0.97,3.4,1.43c5.56,2.28,11.21,4.59,14.13,9.91h10.1c1.86,0,3.37,1.85,2.94,4.11L83,118.77 c-0.42,2.22-1.85,4.11-4.11,4.11H11.46c-2.26,0-3.62-1.9-4.11-4.11L0.1,86.21C-0.4,83.95,1.06,82.1,2.86,82.1L2.86,82.1z M44.8,97.44c2.72,0,4.93,2.21,4.93,4.93s-2.21,4.93-4.93,4.93c-2.72,0-4.93-2.21-4.93-4.93S42.08,97.44,44.8,97.44L44.8,97.44z M40.16,67.29c-0.89-0.23-1.76-0.53-2.61-0.88c-0.21,0.91-0.5,1.79-0.85,2.64c-0.45,1.06-1.01,2.08-1.69,3.04 c0.75,0.83,1.59,1.54,2.51,2.13c2.48,1.6,5.46,2.35,8.4,2.28c2.92-0.07,5.77-0.96,8.01-2.65c0.77-0.59,1.47-1.27,2.07-2.04 c-0.52-0.91-0.97-1.87-1.33-2.88c-0.28-0.77-0.51-1.57-0.69-2.39c-2.86,1.02-5.75,1.53-8.58,1.49 C43.61,67.99,41.86,67.75,40.16,67.29L40.16,67.29z M37.25,63.15c0.92,0.49,1.87,0.88,2.83,1.2c1.8,0.56,3.69,0.84,5.58,0.84v0.01 c3,0,6.04-0.68,8.88-1.97c2.84-1.29,5.46-3.19,7.61-5.61c3.47-3.91,5.72-9.2,5.72-15.57v-9.86l0,0c-0.03-0.94-0.16-1.8-0.4-2.58 c-0.23-0.75-0.57-1.42-1.03-1.99c-1.72-2.15-3.35-2.13-5.68-2.12c-0.21,0-0.43,0-0.72,0c-9.21-0.03-15.24-0.33-20.14-0.99 c-4.52-0.61-8.06-1.52-12.18-2.82c-0.39,0.87-0.84,1.71-1.37,2.54c-0.67,1.05-1.46,2.05-2.35,3l-0.27,13.78 c-0.09,4.66,0.57,7.97,2.13,10.89c1.59,2.96,4.17,5.61,7.87,8.9c0.98,0.87,2.03,1.6,3.12,2.21C37.01,63.02,37.14,63.07,37.25,63.15 L37.25,63.15z M57.14,37.01c1.67,0,3.03,1.36,3.03,3.03c0,1.67-1.36,3.03-3.03,3.03c-1.67,0-3.03-1.36-3.03-3.03 C54.11,38.37,55.46,37.01,57.14,37.01L57.14,37.01z M34.28,37.01c1.67,0,3.03,1.36,3.03,3.03c0,1.67-1.36,3.03-3.03,3.03 c-1.67,0-3.03-1.36-3.03-3.03C31.25,38.37,32.61,37.01,34.28,37.01L34.28,37.01z M39.51,54.59c-0.65-0.42-0.83-1.29-0.41-1.94 c0.42-0.65,1.29-0.83,1.94-0.41c1.6,1.04,3.13,1.6,4.59,1.62c1.41,0.02,2.81-0.48,4.19-1.55c0.61-0.48,1.5-0.37,1.97,0.25 c0.48,0.61,0.37,1.49-0.25,1.97c-1.9,1.48-3.89,2.16-5.95,2.14C43.58,56.63,41.55,55.91,39.51,54.59L39.51,54.59z M16.08,82.1 h56.73c-2.7-3.57-7.31-5.46-11.85-7.32c-0.95-0.39-1.89-0.78-2.8-1.17c-0.76,1.03-1.68,1.92-2.72,2.68 c-2.51,1.82-5.75,2.87-9.1,3.03c-3.33,0.16-6.78-0.55-9.72-2.25c-1.47-0.84-2.81-1.93-3.94-3.26c-1.11,0.45-2.28,0.89-3.48,1.34 C24.39,76.97,19.1,78.97,16.08,82.1L16.08,82.1z" />
                            </g>
                        </svg>
                    </div>
                    <div>
                        <p className="stat-label">Total Students</p>
                        <h3 className="stat-value" id="totalStudents">{stats.totalStudents}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 122.88 115.07" width="20" height="20" fill="var(--primary)">
                            <g>
                                <path d="M12.72,14.71v87.64h110.04v12.72l-116.39,0c-3.51,0-6.36-2.85-6.36-6.36v-94H12.72L12.72,14.71z M121.92,43.82 c1.56,2.04,1.17,4.96-0.87,6.52l-16.89,12.87c-2.04,1.56-4.96,1.17-6.52-0.87c-1.56-2.04-1.17-4.96,0.87-6.52l6.66-5.07 c-14.7-1.44-28.81-5.57-41.21-11.53C47.72,31.86,33.78,20.09,25.94,7.03c-1.32-2.2-0.6-5.06,1.6-6.37c2.2-1.32,5.06-0.6,6.37,1.6 c6.91,11.51,19.43,22,34.93,29.45c10.94,5.26,23.33,8.98,36.24,10.47l-5.69-4.6c-2-1.61-2.32-4.54-0.71-6.54 c1.61-2,4.54-2.32,6.54-0.71L121.92,43.82L121.92,43.82L121.92,43.82z M117.18,81.97v11.41h-14.41V81.97H117.18L117.18,81.97z M91.41,69.97v23.4H77v-23.4H91.41L91.41,69.97z M65.65,61.71v31.66l-14.41,0V61.71H65.65L65.65,61.71z M39.89,49.13v44.25 l-14.41,0V49.13L39.89,49.13L39.89,49.13z" />
                            </g>
                        </svg>
                    </div>
                    <div>
                        <p className="stat-label">Pending Results</p>
                        <h3 className="stat-value">{stats.pendingResults}</h3>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon">
                        <svg viewBox="0 0 99.39 122.88" width="20" height="20" fill="var(--primary)">
                            <g>
                                <path d="M65.72,12.72c-0.31,0-0.58-0.04-0.85-0.13c-1.38,0-2.54-1.12-2.54-2.54v-5H37.7v5c0,1.29-1.03,2.41-2.28,2.5 c-0.27,0.09-0.58,0.13-0.89,0.13h-9.28v10.35h48.59V12.67h-8.21L65.72,12.72L65.72,12.72z M22.85,75.03c2.76,0,5,2.24,5,5 s-2.24,5-5,5s-5-2.24-5-5S20.09,75.03,22.85,75.03L22.85,75.03z M17.07,62.7c-0.69-1.03-0.42-2.43,0.62-3.12 c1.03-0.69,2.43-0.42,3.12,0.62l1.23,1.82l4.87-5.92c0.79-0.96,2.21-1.1,3.17-0.31c0.96,0.79,1.1,2.21,0.31,3.17l-6.74,8.2 c-0.15,0.19-0.33,0.36-0.54,0.51c-1.03,0.69-2.43,0.42-3.12-0.62L17.07,62.7L17.07,62.7z M17.07,45.38 c-0.69-1.03-0.42-2.43,0.62-3.12c1.03-0.69,2.43-0.42,3.12,0.62l1.23,1.82l4.87-5.93c0.79-0.96,2.21-1.1,3.17-0.31 c0.96,0.79,1.1,2.21,0.31,3.17l-6.74,8.2c-0.15,0.19-0.33,0.36-0.54,0.51c-1.03,0.69-2.43,0.42-3.12-0.62L17.07,45.38L17.07,45.38z M69.2,122.21c-0.45,0.4-1.07,0.67-1.7,0.67c-0.13,0-0.27,0-0.4-0.04H5.62c-1.52,0-2.94-0.62-3.97-1.65 C0.62,120.16,0,118.78,0,117.21l0-97.36c0-1.56,0.62-2.94,1.65-3.97c1.03-1.03,2.41-1.65,3.97-1.65h14.63v-2.77 c0-1.03,0.4-1.96,1.12-2.68c0.67-0.67,1.61-1.12,2.68-1.12h8.66V4.19c0-1.16,0.49-2.19,1.25-2.94C34.71,0.49,35.74,0,36.9,0h26.37 c1.16,0,2.19,0.49,2.94,1.25c0.76,0.76,1.25,1.78,1.25,2.94v3.48h7.81c1.03,0,1.96,0.45,2.68,1.12c0.67,0.67,1.12,1.65,1.12,2.68 v2.77h14.63c1.56,0,2.94,0.62,3.97,1.65c1.03,1.03,1.65,2.41,1.65,3.97v70.23c0.2,1.01-0.01,1.79-0.76,2.54l-29.05,29.4 c-0.09,0.09-0.13,0.13-0.22,0.18H69.2L69.2,122.21z M64.96,117.79c0-33.62-4.24-29.63,29.22-29.63V19.85c0-0.13-0.04-0.31-0.18-0.4 c-0.09-0.09-0.22-0.18-0.4-0.18l-14.63,0v5.09c0,1.03-0.4,1.96-1.12,2.68c-0.67,0.67-1.61,1.12-2.68,1.12H24 c-1.03,0-2.01-0.45-2.68-1.12c-0.09-0.09-0.13-0.18-0.22-0.27c-0.54-0.67-0.89-1.52-0.89-2.41v-5.09H5.58 c-0.13,0-0.31,0.04-0.4,0.18C5.09,19.54,5,19.72,5,19.85v97.36c0,0.18,0.04,0.31,0.18,0.4c0.09,0.09,0.22,0.18,0.4,0.18h59.34 H64.96L64.96,117.79z M41.23,81.8c-1.38,0-2.54-1.12-2.54-2.54c0-1.38,1.12-2.54,2.54-2.54h24.13c1.38,0,2.54,1.12,2.54,2.54 c0,1.38-1.12,2.54-2.54,2.54H41.23L41.23,81.8z M41.23,45.52c-1.38,0-2.54-1.12-2.54-2.54c0-1.38,1.12-2.54,2.54-2.54h37.16 c1.38,0,2.54,1.12,2.54,2.54c0,1.38-1.12,2.54-2.54,2.54L41.23,45.52L41.23,45.52z M41.23,63.66c-1.38,0-2.54-1.12-2.54-2.54 c0-1.38,1.12-2.54,2.54-2.54h37.16c1.38,0,2.54,1.12,2.54,2.54c0,1.38-1.12,2.54-2.54,2.54H41.23L41.23,63.66z" />
                            </g>
                        </svg>
                    </div>
                    <div className="stat-content-flex">
                        <p className="stat-label">Pending Assignments</p>
                        <h3 className="stat-value">{stats.pendingAssignments}</h3>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className="main-grid" style={{ gridTemplateColumns: '1fr' }}>
                {/* Assigned Offerings */}
                <div>
                    <div className="section-header">
                        <h2 className="section-title">
                            <svg viewBox="0 0 122.88 99.45" width="24" height="24" fill="var(--primary)" style={{ marginRight: '0.75rem' }}>
                                <path d="M64.48,0.38h18.42c1.85,0,3.36,1.51,3.36,3.36v14.84H61.12V3.74C61.12,1.89,62.63,0.38,64.48,0.38L64.48,0.38z M86.27,27.65v45.19H61.12V27.65H86.27L86.27,27.65z M86.27,81.92v13.8c0,1.85-1.51,3.36-3.36,3.36H64.48 c-1.85,0-3.36-1.51-3.36-3.36v-13.8H86.27L86.27,81.92z M101.09,0.38h18.42c1.85,0,3.36,1.51,3.36,3.36v14.84h-0.02H97.73V3.74C97.73,1.89,99.25,0.38,101.09,0.38 L101.09,0.38z M122.88,27.65v45.19H97.73V27.65h25.13H122.88L122.88,27.65z M122.88,81.92v13.8c0,1.85-1.51,3.36-3.36,3.36h-18.42 c-1.85,0-3.36-1.51-3.36-3.36v-13.8H122.88L122.88,81.92z M35.95,0.2l17.31,6.3c1.74,0.63,2.64,2.57,2.01,4.31L50.2,24.75l-23.63-8.6l5.07-13.94 C32.28,0.47,34.22-0.43,35.95,0.2L35.95,0.2z M47.1,33.28L31.65,75.75l-23.63-8.6l15.45-42.46L47.1,33.28L47.1,33.28z M28.55,84.28 l-4.72,12.96c-0.63,1.74-2.57,2.64-4.31,2.01l-17.31-6.3c-1.74-0.63-2.64-2.57-2.01-4.31l4.72-12.96L28.55,84.28L28.55,84.28z" />
                            </svg>
                            Assigned Courses
                        </h2>
                    </div>

                    <div className="courses-list" id="coursesList">
                        {loading ? (
                            <div className="loading-placeholder">Loading assigned courses...</div>
                        ) : offerings.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--slate-500)', padding: '2rem' }}>No courses assigned to you yet.</div>
                        ) : (
                            offerings.map(offering => (
                                <div
                                    className="card course-card"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => handleCardClick(offering.id)}
                                    key={offering.id}
                                >
                                    <div className="course-left">
                                        <div className="course-icon">
                                            <svg viewBox="0 0 122.88 96.44" width="24" height="24" fill="var(--primary)">
                                                <title>open-book</title>
                                                <path d="M12,73.51q.2-34.74.39-69.38A3.21,3.21,0,0,1,15,1h0C23.4-.75,36.64-.31,45.63,3.14a35.46,35.46,0,0,1,16,11.65,37.34,37.34,0,0,1,16-11.15C86.12.4,99-.38,108.23,1A3.2,3.2,0,0,1,111,4.14h0V73.8A3.21,3.21,0,0,1,107.77,77a3.49,3.49,0,0,1-.74-.09A53.45,53.45,0,0,0,83.58,79.1a71,71,0,0,0-15.77,8.26,69.09,69.09,0,0,1,21.24-3.1,125.42,125.42,0,0,1,27.41,3.48V14.84h3.21a3.21,3.21,0,0,1,3.21,3.21V91.94a3.21,3.21,0,0,1-3.21,3.21,3.18,3.18,0,0,1-1-.17A121.77,121.77,0,0,0,89,90.65a61.89,61.89,0,0,0-25.76,5.26,3.39,3.39,0,0,1-3.64,0,61.86,61.86,0,0,0-25.76-5.26A121.77,121.77,0,0,0,4.24,95a3.18,3.18,0,0,1-1,.17A3.21,3.21,0,0,1,0,91.94V18.05a3.21,3.21,0,0,1,3.21-3.21H6.42v72.9a125.42,125.42,0,0,1,27.41-3.48,68.84,68.84,0,0,1,22.71,3.57A48.7,48.7,0,0,0,41,79.39c-7-2.3-17.68-3.07-25.49-2.4A3.21,3.21,0,0,1,12,74.06a5,5,0,0,1,0-.55ZM73.64,64.4a2.3,2.3,0,1,1-2.5-3.85,51.46,51.46,0,0,1,11.8-5.4,53.73,53.73,0,0,1,13-2.67,2.29,2.29,0,1,1,.25,4.58,49.42,49.42,0,0,0-11.79,2.46A46.73,46.73,0,0,0,73.64,64.4Zm.2-17.76a2.29,2.29,0,0,1-2.46-3.87,52.71,52.71,0,0,1,11.74-5.3A54.12,54.12,0,0,1,95.9,34.85a2.3,2.3,0,0,1,.25,4.59,49.3,49.3,0,0,0-11.63,2.4,48,48,0,0,0-10.68,4.8Zm.06-17.7a2.3,2.3,0,1,1-2.46-3.89,52.54,52.54,0,0,1,11.72-5.27,53.71,53.71,0,0,1,12.74-2.6,2.29,2.29,0,1,1,.25,4.58,49.35,49.35,0,0,0-11.59,2.39A47.91,47.91,0,0,0,73.9,28.94ZM51.74,60.55a2.3,2.3,0,1,1-2.5,3.85,46.73,46.73,0,0,0-10.72-4.88,49.42,49.42,0,0,0-11.79-2.46A2.29,2.29,0,1,1,27,52.48a53.73,53.73,0,0,1,13,2.67,51.46,51.46,0,0,1,11.8,5.4ZM51.5,42.77A2.29,2.29,0,0,1,49,46.64a48,48,0,0,0-10.68-4.8,49.3,49.3,0,0,0-11.63-2.4A2.3,2.3,0,0,1,27,34.85a54.12,54.12,0,0,1,12.78,2.62,52.71,52.71,0,0,1,11.74,5.3Zm-.06-17.72A2.3,2.3,0,1,1,49,28.94a47.91,47.91,0,0,0-10.66-4.79,49.35,49.35,0,0,0-11.59-2.39A2.29,2.29,0,1,1,27,17.18a53.71,53.71,0,0,1,12.74,2.6,52.54,52.54,0,0,1,11.72,5.27ZM104.56,7c-7.42-.7-18.06.12-24.73,2.65A30,30,0,0,0,64.7,21.46V81.72a76.76,76.76,0,0,1,16.72-8.66,62.85,62.85,0,0,1,23.14-2.87V7ZM58.28,81.1V21.37c-3.36-5.93-8.79-9.89-14.93-12.24-7-2.67-17.75-3.27-24.56-2.3l-.36,63.56c7.43-.27,17.69.68,24.52,2.91a54.94,54.94,0,0,1,15.33,7.8Z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="course-title">{offering.courseCode} - {offering.courseName}</h4>
                                            <p className="course-instructor">Section {offering.sectionName || 'A'} | {offering.semesterName || 'Semester'}</p>
                                        </div>
                                    </div>
                                    <div className="course-right">
                                        <div className="attendance-section">
                                            <p className="attendance-label">STUDENTS</p>
                                            <span className="attendance-percent">{offering.enrolledCount || 0}</span>
                                        </div>
                                        <button
                                            className="view-btn"
                                            onClick={(e) => handleViewDetails(e, offering.id)}
                                            style={{
                                                background: 'var(--primary)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '0.5rem',
                                                cursor: 'pointer',
                                                fontWeight: 500
                                            }}
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;

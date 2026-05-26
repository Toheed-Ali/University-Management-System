import { Outlet } from 'react-router-dom';
import StudentSidebar from './StudentSidebar';
import { useState, useEffect } from 'react';
import axios from 'axios';
import '../../pages/admin/AdminDashboard.css';

const StudentLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        loadStudentProfile();
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDarkMode(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const loadStudentProfile = async () => {
        try {
            const res = await axios.get('/api/v1/students/me');
            setProfile(res.data.data);
        } catch (error) {
            console.error('Failed to load profile:', error);
        }
    };

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
        if (!isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const fullName = profile ? `${profile.user?.firstName} ${profile.user?.lastName}` : 'Student';
    const rollNumber = profile?.rollNumber || '---';
    const department = profile?.department?.name || '---';
    const semester = profile?.semester || '-';
    const initials = profile
        ? `${profile.user?.firstName?.[0] || ''}${profile.user?.lastName?.[0] || ''}`.toUpperCase()
        : '--';

    return (
        <div className="student-theme" style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <StudentSidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 90 }}
                />
            )}

            {/* Main Content */}
            <main className="main-content">
                {/* Header */}
                <header className="header">
                    {/* Mobile Menu Toggle */}
                    <button
                        className="mobile-menu-btn"
                        id="mobileMenuBtn"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <div className="header-spacer"></div>
                    <div className="header-right">
                        <div className="user-info-wrapper">
                            <div className="user-info-primary">
                                <h2 className="user-name" id="studentName">{fullName}</h2>
                                <p className="user-roll" id="studentRoll">Roll: {rollNumber}</p>
                            </div>
                            <div className="user-info-secondary">
                                <p className="user-department" id="studentDepartment">{department}</p>
                                <p className="user-semester" id="studentSemester">Semester {semester}</p>
                            </div>
                            <div className="user-avatar-wrapper">
                                <div
                                    className="user-avatar"
                                    id="studentAvatar"
                                    style={{
                                        background: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 700
                                    }}
                                >
                                    <span id="userInitials">{initials}</span>
                                </div>
                                <div className="online-indicator"></div>
                            </div>
                        </div>
                        <button
                            className="theme-toggle-btn"
                            onClick={toggleTheme}
                            aria-label="Toggle Dark Mode"
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                width: '2.1rem',
                                height: '2.1rem',
                                borderRadius: '0.625rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.transform = 'scale(1.05)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'scale(1)';
                            }}
                        >
                            <span
                                className="material-symbols-outlined theme-icon"
                                style={{
                                    fontSize: '1rem',
                                    transition: 'transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                                    transform: isDarkMode ? 'rotate(0deg) scale(1)' : 'rotate(360deg) scale(1)',
                                    display: 'inline-block'
                                }}
                            >
                                {isDarkMode ? 'sunny' : 'bedtime'}
                            </span>
                        </button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="content-area">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default StudentLayout;

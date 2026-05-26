import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminHeader = ({ toggleMobileMenu }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [isDark, setIsDark] = useState(false);

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);

        if (newTheme) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    const getInitials = (firstName, lastName) => {
        if (!firstName || !lastName) return 'AD';
        const initials = (firstName[0] || '') + (lastName[0] || '');
        return initials.toUpperCase() || 'AD';
    };

    return (
        <header className="header">
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
                <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="header-spacer"></div>
            <div className="header-right">
                <div className="user-info-wrapper">
                    <div className="user-info-primary">
                        <h2 className="user-name">{user?.profile?.fullName || 'Admin User'}</h2>
                        <p className="user-roll">{user?.role === 'admin' ? 'UNIVERSITY ADMINISTRATOR' : user?.role}</p>
                    </div>
                    <div className="user-avatar-wrapper">
                        <div className="user-avatar">
                            <span>{getInitials(user?.profile?.firstName, user?.profile?.lastName)}</span>
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
                        width: '2rem',
                        height: '2rem',
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
                            transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(360deg) scale(1)',
                            display: 'inline-block'
                        }}
                    >
                        {isDark ? 'sunny' : 'bedtime'}
                    </span>
                </button>
            </div>
        </header>
    );
};

export default AdminHeader;

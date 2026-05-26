import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import loginImage from '../assets/images/login.png';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            console.log("Attempting login with", email);
            const data = await login(email, password);
            console.log("Login successful, data:", data);

            setSuccess('Login successful!');

            // Use setTimeout to allow AuthContext state to propagate before navigation
            setTimeout(() => {
                if (data.user.role === 'admin') navigate('/admin/dashboard');
                else if (data.user.role === 'teacher') navigate('/teacher/dashboard');
                else if (data.user.role === 'student') navigate('/student/dashboard');
                else navigate('/');
            }, 1500);
        } catch (err) {
            console.error("Login failed:", err);
            if (!err.response) {
                setError('Server is unreachable. Please check your connection or try again later.');
            } else {
                setError(err.response?.data?.error || 'An unexpected error occurred');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Side - Login Form */}
            <div className="login-left">
                <div className="login-form-wrapper">
                    <div className="login-header">
                        <h1 className="login-title">Login</h1>
                        <p className="login-subtitle">Enter your account details</p>
                    </div>

                    {/* Alert Messages */}
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="form-group">
                            <input
                                type="text"
                                id="email"
                                className="form-input"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                spellCheck="false"
                            />
                        </div>

                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    className="form-input"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="login-submit-btn" disabled={loading}>
                            {loading ? 'Signing in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Side - Welcome Section */}
            <div className="login-right">
                <div className="welcome-content">
                    <h2 className="welcome-title">Welcome to<br /><span>University Portal</span></h2>
                    <p className="welcome-subtitle">Login to access your account</p>
                    <div className="welcome-image">
                        <img src={loginImage} alt="University Portal Illustration" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
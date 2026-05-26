import { useState, useEffect } from 'react';
import axios from 'axios';
import './Settings.css';

const Settings = () => {
    const [institution, setInstitution] = useState({
        name: '',
        email: '',
        address: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchInstitution();
    }, []);

    const fetchInstitution = async () => {
        try {
            const res = await axios.get('/api/v1/settings/institution');
            if (res.data.success) {
                setInstitution(res.data.data);
            }
        } catch (error) {
            console.error('Error fetching institution:', error);
            setMessage({ type: 'error', text: 'Failed to load institution settings' });
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setInstitution(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const res = await axios.put('/api/v1/settings/institution', institution);
            if (res.data.success) {
                setMessage({ type: 'success', text: 'Settings updated successfully!' });
                setInstitution(res.data.data);
            }
        } catch (error) {
            console.error('Error updating institution:', error);
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to update settings'
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8">Loading settings...</div>;
    }

    return (
        <div className="settings-page-container">
            <div className="page-header" style={{ marginBottom: '2rem' }}>
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage university and system settings</p>
            </div>

            {message.text && (
                <div className={`mb-4 p-4 rounded-lg ${message.type === 'success'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* University Information */}
            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header">
                    <h3>University Information</h3>
                </div>
                <div className="card-body">
                    <form onSubmit={handleSubmit}>
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">University Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    className="form-input"
                                    value={institution.name || ''}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Admin Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    className="form-input"
                                    value={institution.email || ''}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Location / Address</label>
                                <input
                                    type="text"
                                    id="address"
                                    className="form-input"
                                    value={institution.address || ''}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div style={{ marginTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn-save"
                                disabled={saving}
                            >
                                {saving ? 'Saving...' : 'Save University Settings'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>


        </div>
    );
};

export default Settings;

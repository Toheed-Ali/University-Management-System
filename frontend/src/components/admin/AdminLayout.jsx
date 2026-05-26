import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { useState } from 'react';
import '../../pages/admin/AdminDashboard.css';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        // Wrapper to match legacy HTML body { display: flex }
        <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
            <AdminSidebar
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <main className="main-content">
                <AdminHeader toggleMobileMenu={() => setIsMobileMenuOpen(true)} />
                <div className="content-area">
                    {/* Breadcrumbs can be added here if needed, but legacy UI didn't show them explicitly in screenshots */}
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile sidebar */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminLayout;

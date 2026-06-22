// components/protected/AdminProtectedRoute.jsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { App } from 'antd';
import { useAdminAuth } from '../hooks/useAuth'; // ✅ ADMIN CONTEXT
import { Spin } from 'antd';

const AdminProtectedRoute = () => {
    const { adminUser, loading } = useAdminAuth(); // ✅ ADMIN AUTH
    const location = useLocation();
    const messageApi = App.useApp();

    //console.log('[AdminProtectedRoute] loading:', loading, 'adminUser:', adminUser);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1677ff', color: 'white' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>Đang kiểm tra quyền Admin...</div>
            </div>
        );
    }

    const adminSessionId = sessionStorage.getItem('adminSessionId');
    const adminRole = adminUser?.role ||
        (adminSessionId ? sessionStorage.getItem(`${adminSessionId}_role`) : null);
    const hasAdminToken = adminSessionId && sessionStorage.getItem(`${adminSessionId}_accessToken`);

    //console.log('[AdminProtectedRoute BACKUP]', {
    //    adminSessionId,
    //    adminRole,
    //    hasAdminToken
    //});

    // ✅ CHO QUA NẾU CÓ TOKEN VÀ ROLE ADMIN
    if (hasAdminToken && adminRole === 'ADMIN') {
        //console.log('✅ Admin access OK');
        return <Outlet />;
    }

    console.log('❌ Redirect to login');
    sessionStorage.setItem('adminRedirectAfterLogin', location.pathname);
    return <Navigate to="/admin/login" replace />;
};

export default AdminProtectedRoute;
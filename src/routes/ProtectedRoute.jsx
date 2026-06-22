import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { App } from 'antd';
import useAuth from '../hooks/useAuth'; 
import { Spin } from 'antd';

const UserProtectedRoute = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Đang kiểm tra quyền..." />
      </div>
    );
  }

  const userRole = user?.role;

  // ✅ KHÔNG CÒN CHECK SESSION THỦ CÔNG
  if (!user || !userRole || !allowedRoles.includes(userRole)) {
    sessionStorage.setItem('userRedirectAfterLogin', location.pathname + location.search);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default UserProtectedRoute;
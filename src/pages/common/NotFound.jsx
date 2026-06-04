import React from 'react';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth, useAdminAuth } from '../../hooks/useAuth';

const NotFound = () => {
  const navigate = useNavigate();
  const { user: regularUser } = useAuth();
  const { adminUser } = useAdminAuth();
  
  const user = adminUser || regularUser;

  const handleGoHome = () => {
    if (user?.role === 'ADMIN') {
      navigate('/admin/dashboard');
    } else if (user?.role === 'OWNER') {
      navigate('/landlord/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Result
        status="404"
        title="404"
        subTitle="Xin lỗi, trang bạn tìm kiếm không tồn tại hoặc đã bị xóa."
        extra={
          <Button 
            type="primary" 
            size="large"
            className="bg-blue-600 hover:bg-blue-500"
            onClick={handleGoHome}
          >
            Về Trang Chủ
          </Button>
        }
      />
    </div>
  );
};

export default NotFound;
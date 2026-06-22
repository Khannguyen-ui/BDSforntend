import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { message } from 'antd';

const OAuth2Redirect = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshProfile } = useAuth();

    useEffect(() => {
        const handleOAuthCallback = async () => {
            try {
                const token = searchParams.get('token');

                if (token) {
                    // Lưu token
                    let userSessionId = sessionStorage.getItem('userSessionId');
                    if (!userSessionId) {
                        userSessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                        sessionStorage.setItem('userSessionId', userSessionId);
                    }
                    sessionStorage.setItem(`${userSessionId}_accessToken`, token);

                    // Giải mã JWT để lấy role và thông tin lưu vào session (giống hệt logic đăng nhập thường)
                    try {
                        const base64Url = token.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));
                        const decoded = JSON.parse(jsonPayload);
                        
                        if (decoded.role) sessionStorage.setItem(`${userSessionId}_role`, decoded.role);
                        if (decoded.sub) sessionStorage.setItem(`${userSessionId}_email`, decoded.sub);
                        if (decoded.userId) sessionStorage.setItem(`${userSessionId}_userId`, decoded.userId);
                    } catch (e) {
                        console.error("Lỗi giải mã token OAuth2:", e);
                    }

                    // Refresh profile để lấy user info
                    await refreshProfile();

                        message.success('Đăng nhập Google/Facebook thành công!');
                        navigate('/');
                } else {
                    throw new Error('No token received');
                }
            } catch (error) {
                console.error('OAuth2 error:', error);
                message.error('Đăng nhập thất bại');
                navigate('/login');
            }
        };

        handleOAuthCallback();
    }, [searchParams, navigate, refreshProfile]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div>Đang đăng nhập... <span className="animate-spin">🔄</span></div>
        </div>
    );
};

export default OAuth2Redirect;
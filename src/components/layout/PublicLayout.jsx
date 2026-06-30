import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import {
  Button, Dropdown, Space, Avatar, Badge, message, Modal, Tag, Tooltip
} from 'antd';
import {
  UserOutlined, LogoutOutlined, HistoryOutlined, HomeOutlined,
  HeartOutlined, MessageOutlined, BellOutlined, PlusCircleOutlined,
  ExclamationCircleOutlined, IdcardOutlined,
  SafetyCertificateOutlined, WalletOutlined, LockOutlined, DownOutlined,
  TeamOutlined,
  EditOutlined, PlayCircleFilled, LineChartOutlined
} from '@ant-design/icons';
import useAuth from '../../hooks/useAuth';
import userService from '../../services/userService';
import notificationService from '../../services/notificationService';
import { useNotification } from '../../contexts/NotificationContext';
import ReelsViewer from '../modals/ReelsViewer';
import Footer from './Footer';
import systemLogo from '../../assets/logo.png';
const PublicLayout = () => {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();

  // State quản lý Reels từ Header
  const [isReelsOpen, setIsReelsOpen] = useState(false);

  // --- 1. STATE ĐẾM THÔNG BÁO ---
  const { unreadCount } = useNotification();

  // --- 2. XỬ LÝ ĐĂNG TIN ---
  const handlePostAd = () => {
    if (!user) {
      message.info("Vui lòng đăng nhập để đăng tin!");
      navigate('/login');
      return;
    }

    if (user.role === 'OWNER') {
      navigate('/landlord/create-room');
    } else if (user.role === 'ADMIN') {
      message.warning("Admin không đăng tin trực tiếp.");
    } else {
      // Tenant: Kiểm tra KYC
      if (user.kycStatus !== 'VERIFIED') {
        Modal.confirm({
          title: 'Yêu cầu xác minh danh tính',
          icon: <IdcardOutlined style={{ color: '#faad14' }} />,
          content: (
            <div>
              <p>Để đảm bảo tin cậy, bạn cần <b>xác minh danh tính (eKYC)</b> trước khi có thể đăng tin cho thuê.</p>
              <p className="text-gray-500 text-xs">Quá trình này giúp xác thực bạn là người dùng thật.</p>
            </div>
          ),
          okText: 'Xác minh ngay',
          cancelText: 'Để sau',
          onOk: () => navigate('/kyc'),
          okButtonProps: {
            // Đổi nền màu cam, chữ trắng, hover sang cam đậm, bỏ viền
            className: 'bg-[#fff] text-black hover:bg-[#d85502] hover:text-white border-none shadow-md transition-colors'
          }
        });
        return;
      }

      // Tenant: Đã KYC -> Mời nâng cấp
      Modal.confirm({
        title: 'Kích hoạt quyền Chủ trọ',
        icon: <ExclamationCircleOutlined />,
        content: 'Tài khoản của bạn đã được xác thực. Bạn cần nâng cấp lên "Chủ trọ" để bắt đầu đăng tin. Nâng cấp ngay?',
        okText: 'Nâng cấp ngay',
        cancelText: 'Để sau',
        onOk: async () => {
          try {
            await userService.upgradeToLandlord();
            message.success("Nâng cấp thành công! Vui lòng đăng nhập lại.");
            logout();
          } catch (error) {
            message.error("Lỗi nâng cấp: " + (error.response?.data?.message || "Vui lòng thử lại sau"));
          }
        }
      });
    }
  };

  // --- 3. CẤU HÌNH MENU DROPDOWN ---
  const userMenu = {
    items: [
      // Banner Quảng cáo
      {
        key: 'banner',
        label: (
          <div className="w-[280px] p-1 cursor-default" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-lg p-3 text-white relative overflow-hidden shadow-inner">
              <div className="relative z-10">
                <h4 className="text-white font-bold text-lg m-0">Gói Hội viên</h4>
                <p className="text-xs text-white/80 mt-1 mb-2">Tiết kiệm đến 39% chi phí</p>
                <Button
                  size="small"
                  className="bg-white text-red-700 border-none font-bold hover:bg-gray-100 rounded shadow-sm"
                  onClick={() => navigate('/landlord/finance')}
                >
                  Tìm hiểu thêm
                </Button>
              </div>
              <div className="absolute right-[-10px] bottom-[-10px] opacity-20">
                <HomeOutlined style={{ fontSize: '80px', color: 'white' }} />
              </div>
            </div>
          </div>
        ),
        type: 'group'
      },
      ...(user?.role === 'ADMIN' ? [
        {
          key: 'go-to-admin',
          label: <span className="font-bold text-red-600">Vào Trang Quản Trị</span>,
          icon: <SafetyCertificateOutlined className="text-red-600" />,
          onClick: () => navigate('/admin/dashboard')
        },
        { type: 'divider' },
      ] : []),

      // Menu 
      ...(user?.role === 'OWNER' ? [
        {
          key: 'dashboard',
          label: <span className="font-bold">Tổng quan <Tag color="red" className="ml-1 text-[10px]">Mới</Tag></span>,
          icon: <HomeOutlined />,
          onClick: () => navigate('/landlord/dashboard')
        },
        {
          key: 'my-rooms',
          label: 'Quản lý tin đăng',
          icon: <HistoryOutlined />,
          onClick: () => navigate('/landlord/room-list')
        },

        {
          key: 'finance',
          label: 'Tài chính & Ví',
          icon: <WalletOutlined />,
          onClick: () => navigate('/landlord/finance')
        },
      ] : []),

      // Menu cho User
      ...(user?.role === 'USER' ? [
        {
          key: 'my-appointments',
          label: 'Lịch hẹn của tôi',
          icon: <HistoryOutlined />,
          onClick: () => navigate('/tenant/appointments')
        },
        {
          key: 'wishlist',
          label: 'Yêu thích & Đã lưu',
          icon: <HeartOutlined style={{ color: '#ef4444' }} />,
          onClick: () => navigate('/favorites')
        },
      ] : []),

      { type: 'divider' },

      // Menu CHUNG (Tài khoản) - Đã thêm mục Chỉnh sửa
      {
        key: 'profile',
        label: 'Thông tin cá nhân',
        icon: <UserOutlined />,
        onClick: () => navigate('/profile')
      },
      {
        key: 'edit-profile',
        label: 'Chỉnh sửa hồ sơ', // <--- [MỚI] Mục này
        icon: <EditOutlined />,
        onClick: () => navigate('/profile') // Điều hướng đến trang Profile (nơi có form sửa)
      },
      {
        key: 'security',
        label: 'Đổi mật khẩu & KYC',
        icon: <LockOutlined />,
        onClick: () => navigate('/kyc')
      },

      { type: 'divider' },

      // Đăng xuất
      {
        key: 'logout',
        label: 'Đăng xuất',
        icon: <LogoutOutlined />,
        danger: true,
        onClick: logout
      },
    ]
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">

          {/* Left section containing logo and navigation links */}
          <div className="flex items-center gap-4 md:gap-8 flex-shrink-0">
            <Link to="/" className="flex items-center hover:opacity-9 transition-opacity">
              <img
                src={systemLogo}
                alt="BDS Logo"
                className="h-10 w-auto object-contain" // h-10 ôm vừa vặn thanh Header cao 16 (h-16)
              />
            </Link>

            <nav className="hidden md:flex items-center gap-6">

              <Link to="/analytics" className="text-gray-600 hover:text-[#f96302] font-bold text-sm transition-colors flex items-center gap-1">
                <LineChartOutlined /> Góc nhìn thị trường
              </Link>
            </nav>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">

            {/* NÚT REELS TỔNG - LUÔN HIỆN ĐỂ TEST */}
            <Tooltip title="Lướt Video (Reels)">
              <div
                className="cursor-pointer flex items-center justify-center bg-gray-100 hover:bg-orange-100 w-8 h-8 md:w-9 md:h-9 rounded-full transition-colors"
                onClick={() => setIsReelsOpen(true)}
              >
                <PlayCircleFilled className="text-lg md:text-xl text-[#f96302]" />
              </div>
            </Tooltip>

            {/* Icons tiện ích (Chỉ hiện khi login) */}
            {user && user.role !== 'ADMIN' && (
              <div className="hidden md:flex gap-4 mr-2 items-center">
                <Tooltip title="Yêu thích & Đã lưu">
                  <HeartOutlined
                    className="text-xl text-gray-600 hover:text-[#f96302] cursor-pointer"
                    onClick={() => navigate('/favorites')}
                  />
                </Tooltip>

                <div
                  className="cursor-pointer flex items-center"
                  onClick={() => navigate('/notifications')}
                >
                  <Badge count={unreadCount} size="small" offset={[0, -5]}>
                    <BellOutlined className="text-xl text-gray-600 hover:text-[#f96302]" />
                  </Badge>
                </div>
              </div>
            )}

            {/* Nút Đăng Tin */}
            {(!user || user.role !== 'ADMIN') && (
              <Button
                type="primary"
                className="bg-black hover:bg-gray-800 border-none rounded-full font-bold px-4 md:px-6 h-8 md:h-9 flex items-center text-xs md:text-sm"
                icon={<PlusCircleOutlined />}
                onClick={handlePostAd}
              >
                Đăng tin
              </Button>
            )}

            {/* User Dropdown */}
            {loading ? (
              <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <Dropdown
                menu={userMenu}
                placement="bottomRight"
                trigger={['click']}
                classNames="w-[300px]" // Menu rộng
              >
                <Space className="cursor-pointer hover:bg-gray-100 py-1 px-2 rounded-full transition border border-gray-200 flex items-center gap-1 md:gap-2">
                  <Avatar src={user.avatarUrl || user.avatar} icon={<UserOutlined />} className="bg-orange-500 w-7 h-7 md:w-8 md:h-8" />
                  <span className="hidden md:inline font-medium text-gray-700 max-w-[100px] truncate">
                    {user.fullName}
                  </span>
                  <DownOutlined className="text-[10px] text-gray-400" />
                </Space>
              </Dropdown>
            ) : (
              <Space>
                <Link to="/login">
                  <Button type="text" className="font-medium hover:bg-gray-100 rounded-full px-2 sm:px-4 text-xs sm:text-sm">Đăng nhập</Button>
                </Link>

              </Space>
            )}
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-grow">
        <Outlet />
      </main>

      <Footer />

      {/* REELS VIEWER TỪ TRANG CHỦ */}
      <ReelsViewer
        isOpen={isReelsOpen}
        onClose={() => setIsReelsOpen(false)}
      />
    </div>
  );
};

export default PublicLayout;
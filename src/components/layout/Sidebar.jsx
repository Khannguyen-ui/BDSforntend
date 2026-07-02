import React, { useState, useEffect } from "react";
import { Layout, Menu, Avatar, Typography, Button, Badge } from "antd";
import {
  PieChartOutlined,
  HomeOutlined,
  UserOutlined,
  BellOutlined,
  SearchOutlined,
  UnorderedListOutlined,
  WalletOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  SettingOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  CrownOutlined,
  CheckSquareOutlined,
  DatabaseOutlined,
  BankOutlined,
  GiftOutlined,
  AppstoreOutlined,
  RocketOutlined,
  MessageOutlined,
  HeartOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, useAdminAuth } from "../../hooks/useAuth";
import paymentService from "../../services/paymentService";
import { useNotification } from "../../contexts/NotificationContext";

const { Sider } = Layout;
const { Text } = Typography;

const Sidebar = () => {
  const { user: regularUser, logout: regularLogout } = useAuth();
  const { adminUser, logout: adminLogout } = useAdminAuth();
  const user = adminUser || regularUser;

  const navigate = useNavigate();
  const location = useLocation();

  const isLandlord = user?.role === "OWNER";
  const isTenant = user?.role === "USER";

  const { unreadCount } = useNotification();
  const [realTimeBalance, setRealTimeBalance] = useState(
    user?.accountBalance || 0
  );

  useEffect(() => {
    const fetchLatestBalance = async () => {
      if (user?.id && isLandlord) {
        try {
          const historyRes = await paymentService.getMyHistory(user.id);
          const rawHistory = historyRes.data?.result || historyRes.data || [];
          const historyArr = Array.isArray(rawHistory)
            ? rawHistory
            : rawHistory?.content || [];

          let computedBalance = 0;

          historyArr.forEach((txn) => {
            if (txn.status === "SUCCESS") {
              if (txn.type === "DEPOSIT" || txn.type === "REFUND") {
                computedBalance += txn.amount;
              } else if (
                [
                  "PURCHASE_PACKAGE",
                  "DEDUCTION",
                  "POST_FEE",
                  "ROOM_PROMOTION",
                  "PUSH_ROOM",
                  "MEMBERSHIP",
                ].includes(txn.type)
              ) {
                computedBalance -= txn.amount;
              }
            }
          });

          setRealTimeBalance(computedBalance);
        } catch (error) {
          console.error("Lỗi cập nhật số dư sidebar:", error);
        }
      }
    };

    fetchLatestBalance();
  }, [user, location.pathname, isLandlord]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const accountSettingsGroup = {
    key: "grp_account",
    label: "Tài khoản & hỗ trợ",
    type: "group",
    children: [
      {
        key: "sub_account",
        icon: <SettingOutlined />,
        label: "Tài khoản",
        children: [
          {
            key: "/profile",
            icon: <UserOutlined />,
            label: "Cài đặt tài khoản",
          },
        ],
      },
      {
        key: "sub_help",
        icon: <FileTextOutlined />,
        label: "Hỗ trợ",
        children: [
          { key: "/pricing", label: "Báo giá" },
          { key: "/payment-guide", label: "Hướng dẫn thanh toán" },
          {
            key: "/usage-guide",
            icon: <QuestionCircleOutlined />,
            label: "Hướng dẫn sử dụng",
          },
        ],
      },
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Đăng xuất",
        danger: true,
      },
    ],
  };

  const adminItems = [
    {
      type: "group",
      label: "Quản trị hệ thống",
      children: [
        { key: "/admin/dashboard", icon: <PieChartOutlined />, label: "Tổng quan" },
        {
          key: "/admin/recommend-dashboard",
          icon: <RocketOutlined />,
          label: "AI & Đề xuất",
        },
        { key: "/admin/source-analytics", icon: <CheckSquareOutlined />, label: "CTR" },
        { key: "/admin/approve-rooms", icon: <CheckSquareOutlined />, label: "Duyệt tin đăng" },
        { key: "/admin/rooms", icon: <DatabaseOutlined />, label: "Quản lý tin đăng" },
        { key: "/admin/projects", icon: <BankOutlined />, label: "Quản lý dự án" },
        { key: "/admin/users", icon: <TeamOutlined />, label: "Người dùng" },
        { key: "/admin/service-packages", icon: <GiftOutlined />, label: "Gói dịch vụ" },
        { key: "/admin/master-data", icon: <AppstoreOutlined />, label: "Tiện ích" },
      ],
    },
    accountSettingsGroup,
  ];

  const landlordItems = [
    {
      type: "group",
      label: "Quản lý cho thuê",
      children: [
        { key: "/landlord/dashboard", icon: <PieChartOutlined />, label: "Tổng quan" },
        { key: "/landlord/create-room", icon: <HomeOutlined />, label: "Đăng tin mới" },
        { key: "/landlord/room-list", icon: <UnorderedListOutlined />, label: "Tin đã đăng" },
        { key: "/landlord/appointments", icon: <ClockCircleOutlined />, label: "Lịch hẹn" },
        { key: "/messages", icon: <MessageOutlined />, label: "Tin nhắn" },
        { key: "/landlord/finance", icon: <WalletOutlined />, label: "Tài chính & Ví" },
      ],
    },
    accountSettingsGroup,
  ];

  const tenantItems = [
    {
      type: "group",
      label: "Tiện ích",
      children: [
        { key: "/", icon: <SearchOutlined />, label: "Tìm phòng ngay" },
        { key: "/tenant/appointments", icon: <ClockCircleOutlined />, label: "Lịch hẹn của tôi" },
        { key: "/messages", icon: <MessageOutlined />, label: "Tin nhắn" },
        { key: "/favorites", icon: <HeartOutlined />, label: "Yêu thích & Đã lưu" },
        {
          key: "/notifications",
          icon: (
            <Badge count={unreadCount} size="small" offset={[4, -2]}>
              <BellOutlined />
            </Badge>
          ),
          label: "Thông báo",
        },
      ],
    },
    { type: "divider" },
    {
      key: "/kyc",
      icon: <CrownOutlined />,
      label: <span className="font-semibold text-[#E03C31]">Đăng tin cho thuê</span>,
    },
    accountSettingsGroup,
  ];

  const defaultItems = [
    {
      type: "group",
      label: "Tiện ích",
      children: [
        { key: "/", icon: <HomeOutlined />, label: "Trang chủ" },
        { key: "/messages", icon: <MessageOutlined />, label: "Tin nhắn" },
        { key: "/favorites", icon: <HeartOutlined />, label: "Yêu thích & Đã lưu" },
        {
          key: "/notifications",
          icon: (
            <Badge count={unreadCount} size="small" offset={[4, -2]}>
              <BellOutlined />
            </Badge>
          ),
          label: "Thông báo",
        },
      ],
    },
    accountSettingsGroup,
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case "ADMIN":
        return adminItems;
      case "OWNER":
        return landlordItems;
      case "USER":
        return tenantItems;
      default:
        return defaultItems;
    }
  };

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      if (adminUser) {
        adminLogout?.();
        navigate("/admin/login");
      } else {
        regularLogout?.();
        navigate("/login");
      }
      return;
    }

    navigate(key);
  };

  return (
    <Sider
      width={280}
      theme="light"
      collapsible
      breakpoint="lg"
      className="!bg-white border-r border-gray-100 shadow-[8px_0_30px_rgba(15,23,42,0.04)]"
    >
      <div
        className="h-20 flex items-center justify-center cursor-pointer border-b border-gray-100"
        onClick={() => navigate(user?.role === "ADMIN" ? "/admin/dashboard" : "/")}
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E03C31] to-[#ff6b5f] text-white flex items-center justify-center shadow-md">
            <HomeOutlined />
          </div>

          <div className="leading-tight">
            <div className="font-extrabold text-xl text-gray-900">
              Home<span className="text-[#E03C31]">Verse</span>
            </div>
            <div className="text-[11px] text-gray-400 font-medium">
              Smart Real Estate
            </div>
          </div>
        </div>
      </div>

      {user && (
        <div className="p-4 border-b border-gray-100">
          <div className="rounded-[24px] bg-gradient-to-br from-[#FFF5F4] to-white border border-red-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Avatar
                size={54}
                icon={<UserOutlined />}
                src={user.avatar}
                className="shadow-md border border-white"
              />

              <div className="min-w-0">
                <Text strong className="block text-[15px] text-gray-900 truncate">
                  {user.fullName || "Người dùng"}
                </Text>

                <Text className="text-xs text-gray-400">
                  {user.role === "ADMIN"
                    ? "Quản trị viên"
                    : user.role === "OWNER"
                    ? "Chủ trọ"
                    : "Người thuê"}
                </Text>
              </div>
            </div>

            {isLandlord && (
              <div className="mt-4 rounded-2xl bg-white border border-gray-100 p-3">
                <div className="flex justify-between items-center mb-2">
                  <Text className="text-xs text-gray-400">Số dư ví</Text>
                  <Text strong className="text-[#E03C31] text-sm">
                    {formatCurrency(realTimeBalance)}
                  </Text>
                </div>

                <Button
                  block
                  size="small"
                  icon={<WalletOutlined />}
                  className="rounded-xl bg-gray-900 text-white border-gray-900 hover:!text-white hover:!border-gray-900"
                  onClick={() => navigate("/landlord/finance")}
                >
                  Nạp tiền
                </Button>
              </div>
            )}

            {isTenant && (
              <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-3 text-center">
                <CrownOutlined className="text-xl text-[#E03C31]" />
                <Text strong className="block text-xs text-gray-800 mt-1 mb-2">
                  Bạn có phòng cho thuê?
                </Text>

                <Button
                  type="primary"
                  size="small"
                  block
                  className="rounded-xl bg-[#E03C31] border-[#E03C31] font-semibold"
                  onClick={() => navigate("/kyc")}
                >
                  Đăng ký chủ trọ
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-3 py-4 h-[calc(100%-80px)] overflow-y-auto custom-scrollbar bg-[#FAFBFD]">
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={["sub_account"]}
          items={getMenuItems()}
          onClick={handleMenuClick}
          className="modern-sidebar-menu !bg-transparent !border-none"
        />
      </div>

      <style>{`
        .modern-sidebar-menu .ant-menu-item,
        .modern-sidebar-menu .ant-menu-submenu-title {
          height: 44px !important;
          line-height: 44px !important;
          border-radius: 14px !important;
          margin: 4px 0 !important;
          color: #475569;
          font-weight: 500;
        }

        .modern-sidebar-menu .ant-menu-item-selected {
          background: linear-gradient(135deg, #fff1f0, #ffffff) !important;
          color: #E03C31 !important;
          font-weight: 700;
          box-shadow: 0 8px 24px rgba(224, 60, 49, 0.08);
        }

        .modern-sidebar-menu .ant-menu-item-selected .anticon,
        .modern-sidebar-menu .ant-menu-submenu-selected .anticon {
          color: #E03C31 !important;
        }

        .modern-sidebar-menu .ant-menu-item:hover,
        .modern-sidebar-menu .ant-menu-submenu-title:hover {
          background: #ffffff !important;
          color: #E03C31 !important;
        }

        .modern-sidebar-menu .ant-menu-item-group-title {
          color: #94a3b8 !important;
          font-size: 11px !important;
          font-weight: 800 !important;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 14px 12px 6px !important;
        }

        .modern-sidebar-menu .ant-menu-sub {
          background: transparent !important;
        }

        .modern-sidebar-menu .ant-menu-item-danger {
          color: #ef4444 !important;
        }
      `}</style>
    </Sider>
  );
};

export default Sidebar;
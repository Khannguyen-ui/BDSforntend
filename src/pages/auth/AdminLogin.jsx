import React, { useState } from 'react';
import {
  Form, Input, Button, Card, Typography, App
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  SafetyCertificateFilled
} from '@ant-design/icons';  // ✅ Import icons từ đây
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const { login, adminUser, logout } = useAdminAuth(); // ✅ Thêm refreshProfile
  const navigate = useNavigate();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);

      if (result.success) {
        // ✅ CHECK ROLE TRỰC TIẾP TỪ SESSION STORAGE (NHANH NHẤT)
        const adminSessionId = sessionStorage.getItem('adminSessionId');
        const role = adminSessionId ? sessionStorage.getItem(`${adminSessionId}_role`) : null;

        if (role === 'ADMIN') {
          navigate('/admin/dashboard', { replace: true });
          message.success("✅ Đăng nhập Admin thành công!");
        } else {
          // Clear session nếu không phải Admin
          if (adminSessionId) {
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith(`${adminSessionId}_`)) {
                sessionStorage.removeItem(key);
              }
            });
          }
          logout();
          message.error("📛 Tài khoản không có quyền Admin!");
        }
      }
    } catch (error) {
      message.error("❌ Lỗi đăng nhập");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#020617] p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(249,99,2,0.18),transparent_35%)]"></div>
      <div className="absolute top-[-120px] right-[-120px] w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-140px] left-[-100px] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 rounded-3xl overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.45)] border border-white/10 bg-white/5 backdrop-blur-xl">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-blue-500/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 -left-20 w-60 h-60 bg-orange-500/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <SafetyCertificateFilled className="text-blue-400" />
              Smart Rental Admin
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Trung tâm quản trị hệ thống Homevers
            </h1>

            <p className="text-slate-300 leading-7 max-w-md">
              Theo dõi người dùng, kiểm duyệt tin đăng, quản lý giao dịch, gói dịch vụ và dữ liệu vận hành trong một không gian bảo mật.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4">
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="font-bold mb-1">Bảo mật truy cập</div>
              <div className="text-sm text-slate-300">Chỉ tài khoản có quyền Admin mới được phép đăng nhập.</div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="font-bold mb-1">Kiểm soát vận hành</div>
              <div className="text-sm text-slate-300">Quản lý người dùng, bài đăng, thanh toán và tương tác hệ thống.</div>
            </div>

            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur">
              <div className="font-bold mb-1">Giám sát dữ liệu</div>
              <div className="text-sm text-slate-300">Theo dõi hoạt động bất thường và hỗ trợ xử lý nhanh.</div>
            </div>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="relative p-6 sm:p-10 flex items-center">
          <div className="w-full max-w-md mx-auto">
            <Card
              className="bg-white/95 backdrop-blur border-none rounded-3xl shadow-2xl"
              bordered={false}
              bodyStyle={{ padding: 32 }}
            >
              <div className="text-center mb-8">
                <div className="relative mx-auto mb-5 w-20 h-20">
                  <div className="absolute inset-0 bg-blue-500/20 rounded-3xl rotate-6"></div>
                  <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center shadow-lg shadow-blue-200">
                    <SafetyCertificateFilled className="text-4xl text-white" />
                  </div>
                </div>

                <Title level={2} style={{ margin: 0, color: '#0f172a' }}>
                  Admin Portal
                </Title>

                <Text className="text-gray-500 block mt-2">
                  Đăng nhập để truy cập hệ thống quản trị Smart Rental
                </Text>
              </div>

              <Form
                name="admin_login"
                layout="vertical"
                onFinish={onFinish}
                size="large"
              >
                <Form.Item
                  label={<span className="font-semibold text-gray-700">Email quản trị</span>}
                  name="email"
                  rules={[{ required: true, message: 'Nhập email quản trị!' }]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="Email Quản trị viên"
                    className="h-12 rounded-xl border-gray-200 hover:border-blue-500 focus:border-blue-500"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Mật khẩu</span>}
                  name="password"
                  rules={[{ required: true, message: 'Nhập mật khẩu!' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Mật khẩu"
                    className="h-12 rounded-xl border-gray-200 hover:border-blue-500 focus:border-blue-500"
                  />
                </Form.Item>

                <Form.Item className="mb-4 mt-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full h-12 rounded-xl border-none font-extrabold bg-gradient-to-r from-blue-600 to-slate-900 hover:from-blue-500 hover:to-slate-800 shadow-lg shadow-blue-200"
                    loading={loading}
                  >
                    ĐĂNG NHẬP HỆ THỐNG
                  </Button>
                </Form.Item>
              </Form>

              <div className="mt-5 rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
                <Text className="text-red-500 text-xs font-medium">
                  Truy cập trái phép sẽ bị ghi lại IP và nhật ký bảo mật.
                </Text>
              </div>
            </Card>

            <div className="text-center mt-6">
              <Text className="text-slate-400 text-xs">
                © 2025 Homevers Admin Security Console
              </Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
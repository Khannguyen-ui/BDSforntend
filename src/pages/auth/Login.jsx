import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, App } from 'antd';
import { UserOutlined, LockOutlined, HomeFilled, QuestionCircleOutlined, GoogleOutlined, FacebookFilled } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const email = values.email.trim();
      const success = await login(email, values.password);

      if (success.success) {
        setTimeout(async () => {
          // ✅ Lấy role từ USER session
          const userSessionId = sessionStorage.getItem('userSessionId');
          const role = sessionStorage.getItem(`${userSessionId}_role`)?.toUpperCase();

          if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
            logout(); // ✅ Chỉ logout USER session
            message.warning("Cổng này dành cho Người dùng. Đang chuyển hướng...");
            setTimeout(() => { window.location.href = '/admin/login'; }, 1500);
            return;
          }

          if (role === 'OWNER' || role === 'ROLE_OWNER') {
            message.success("Chào mừng bạn quay trở lại!");
            navigate('/');
          } else {
            message.success("Đăng nhập thành công!");
            navigate('/');
          }
        }, 200);
      } else {
        message.error(success.message);
      }
    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.message;

      if (status === 401) {
        message.error('Email hoặc mật khẩu không đúng');
        return;
      }

      message.error(msg || 'Đăng nhập thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#fff7ed] p-4">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-red-50"></div>
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-20"></div>
      <div className="absolute inset-0 bg-white/55"></div>
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#f96302]/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-28 -left-24 w-96 h-96 bg-red-400/20 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/85 backdrop-blur-xl rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(15,23,42,0.2)] border border-white">

        {/* LEFT PANEL */}
        <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-[#f96302] via-orange-600 to-red-600 text-white overflow-hidden">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/10 rounded-full"></div>
          <div className="absolute bottom-10 -left-20 w-60 h-60 bg-black/10 rounded-full"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <HomeFilled />
              Homevers
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Chào mừng bạn quay trở lại
            </h1>

            <p className="text-white/85 leading-7 max-w-md">
              Đăng nhập để tiếp tục tìm phòng, lưu tin yêu thích, đặt lịch xem phòng và kết nối với chủ trọ nhanh chóng.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4">
            <div className="bg-white/15 border border-white/20 backdrop-blur rounded-2xl p-4">
              <div className="font-bold mb-1">Tìm phòng thông minh</div>
              <div className="text-sm text-white/80">Gợi ý phòng phù hợp theo vị trí, ngân sách và hành vi tìm kiếm.</div>
            </div>

            <div className="bg-white/15 border border-white/20 backdrop-blur rounded-2xl p-4">
              <div className="font-bold mb-1">Lưu tin & theo dõi</div>
              <div className="text-sm text-white/80">Quản lý các tin yêu thích và quay lại xem nhanh khi cần.</div>
            </div>

            <div className="bg-white/15 border border-white/20 backdrop-blur rounded-2xl p-4">
              <div className="font-bold mb-1">Kết nối chủ trọ</div>
              <div className="text-sm text-white/80">Nhắn tin, đặt lịch và liên hệ trực tiếp trên hệ thống.</div>
            </div>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="relative p-6 sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div className="absolute inset-0 bg-[#f96302]/20 rounded-3xl rotate-6"></div>
                <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-[#f96302] to-red-500 flex items-center justify-center shadow-lg shadow-orange-200">
                  <HomeFilled className="text-4xl text-white" />
                </div>
              </div>

              <Title level={2} style={{ margin: 0 }}>
                Đăng nhập
              </Title>

              <Text type="secondary" className="block mt-2">
                Chào mừng bạn đến với Homevers 
              </Text>
            </div>

            <Card
              bordered={false}
              className="shadow-none bg-transparent"
              bodyStyle={{ padding: 0 }}
            >
              <Form
                name="login_form"
                layout="vertical"
                onFinish={onFinish}
                size="large"
              >
                <Form.Item
                  label={<span className="font-semibold text-gray-700">Email</span>}
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lâu nhập Email!' },
                    { type: 'email', message: 'Email không hợp lệ!' }
                  ]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="Email của bạn"
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Mật khẩu</span>}
                  name="password"
                  rules={[{ required: true, message: 'Vui lòng nhập mật khẩu!' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Mật khẩu"
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <div className="flex justify-end mb-6">
                  <Link
                    to="/forgot-password"
                    className="text-[#f96302] hover:text-[#d85502] transition-colors flex items-center gap-1 font-semibold"
                  >
                    <QuestionCircleOutlined /> Quên mật khẩu?
                  </Link>
                </div>

                <Form.Item className="mb-4">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full h-12 rounded-xl border-none font-extrabold text-base bg-gradient-to-r from-[#f96302] to-red-500 hover:from-[#d85502] hover:to-red-600 shadow-lg shadow-orange-200 uppercase"
                    loading={loading}
                  >
                    ĐĂNG NHẬP
                  </Button>
                </Form.Item>

                <Divider plain className="text-gray-400">
                  Hoặc đăng nhập với
                </Divider>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  <Button
                    size="large"
                    icon={<GoogleOutlined className="text-red-500" />}
                    className="h-12 rounded-xl font-semibold border-gray-200 hover:border-red-300 hover:text-red-500 flex items-center justify-center"
                    onClick={() => window.location.href = '/oauth2/authorization/google'}
                  >
                    Google
                  </Button>

                  <Button
                    size="large"
                    icon={<FacebookFilled className="text-blue-600" />}
                    className="h-12 rounded-xl font-semibold border-gray-200 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center"
                    onClick={() => window.location.href = '/oauth2/authorization/facebook'}
                  >
                    Facebook
                  </Button>
                </div>

                <div className="text-center bg-gray-50 rounded-xl py-4 border border-gray-100 mb-4">
                  <Text className="text-gray-500">Bạn chưa có tài khoản? </Text>
                  <Link to="/register" className="text-[#f96302] font-bold hover:underline">
                    Đăng ký ngay
                  </Link>
                </div>

                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 transition-all hover:bg-orange-100/60">
                  <Text type="secondary" className="text-xs block mb-1 text-center">
                    Bạn là chủ bất động sản?
                  </Text>
                  <Link
                    to="/"
                    className="text-[#f96302] font-extrabold flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    Hợp tác cùng chúng tôi <HomeFilled />
                  </Link>
                </div>
              </Form>
            </Card>

            <p className="text-center text-xs text-gray-400 mt-6">
              Homevers giúp bạn tìm phòng nhanh hơn, an toàn hơn và minh bạch hơn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
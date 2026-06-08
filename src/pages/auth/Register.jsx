import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserAddOutlined, LockOutlined, MailOutlined, SmileOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

const { Title, Text } = Typography;

const Register = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    setLoading(true);

    try {
      const payload = {
        fullName: values.fullName?.trim(),
        email: values.email?.trim(),
        password: values.password
      };

      await authService.register(payload);

      message.success('Đăng ký thành công! Hãy đăng nhập để tìm phòng.');
      navigate('/login');
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        'Đăng ký thất bại. Email có thể đã tồn tại.';

      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-[#fff7ed] p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-red-50"></div>
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-orange-300/30 rounded-full blur-3xl"></div>
      <div className="absolute top-20 -right-24 w-80 h-80 bg-red-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-120px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-[#f96302]/10 rounded-full blur-3xl"></div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_25px_70px_rgba(15,23,42,0.18)] overflow-hidden border border-white">

        {/* LEFT BRAND PANEL */}
        <div className="hidden lg:flex relative flex-col justify-between p-10 bg-gradient-to-br from-[#f96302] via-orange-600 to-red-600 text-white overflow-hidden">
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full"></div>
          <div className="absolute -left-20 bottom-10 w-52 h-52 bg-black/10 rounded-full"></div>

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <UserAddOutlined />
              Homevers Smart Rental
            </div>

            <h1 className="text-4xl font-extrabold leading-tight mb-4">
              Tạo tài khoản để bắt đầu hành trình tìm phòng
            </h1>

            <p className="text-white/85 text-base leading-7 max-w-md">
              Lưu tin yêu thích, đặt lịch xem phòng, nhắn tin với chủ trọ và nhận gợi ý phù hợp theo nhu cầu của bạn.
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-1 gap-4">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="font-bold mb-1">Tìm phòng nhanh hơn</div>
              <div className="text-sm text-white/80">Gợi ý thông minh theo khu vực, giá và hành vi tìm kiếm.</div>
            </div>

            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="font-bold mb-1">Lưu tin yêu thích</div>
              <div className="text-sm text-white/80">Theo dõi những phòng phù hợp để quay lại xem bất cứ lúc nào.</div>
            </div>

            <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
              <div className="font-bold mb-1">Kết nối chủ trọ</div>
              <div className="text-sm text-white/80">Nhắn tin, đặt lịch và liên hệ trực tiếp trong hệ thống.</div>
            </div>
          </div>
        </div>

        {/* FORM PANEL */}
        <div className="relative p-6 sm:p-10">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <div className="relative mx-auto mb-5 w-20 h-20">
                <div className="absolute inset-0 bg-[#f96302]/20 rounded-3xl rotate-6"></div>
                <div className="relative bg-gradient-to-br from-[#f96302] to-red-500 w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg shadow-orange-200">
                  <UserAddOutlined className="text-4xl text-white" />
                </div>
              </div>

              <Title level={2} style={{ margin: 0 }}>
                Đăng ký tài khoản
              </Title>

              <Text type="secondary" className="block mt-2">
                Tạo tài khoản miễn phí để tìm phòng và lưu tin yêu thích
              </Text>
            </div>

            <Card
              bordered={false}
              className="shadow-none bg-transparent"
              bodyStyle={{ padding: 0 }}
            >
              <Form
                form={form}
                name="register_user"
                layout="vertical"
                onFinish={onFinish}
                size="large"
                autoComplete="off"
              >
                <Form.Item
                  label={<span className="font-semibold text-gray-700">Họ và tên</span>}
                  name="fullName"
                  rules={[
                    { required: true, message: 'Vui lòng nhập họ tên!' },
                    { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' }
                  ]}
                >
                  <Input
                    prefix={<SmileOutlined className="text-gray-400" />}
                    placeholder="Nhập họ và tên"
                    allowClear
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Email</span>}
                  name="email"
                  rules={[
                    { required: true, message: 'Vui lòng nhập email!' },
                    { type: 'email', message: 'Email sai định dạng!' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined className="text-gray-400" />}
                    placeholder="Nhập email"
                    allowClear
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Mật khẩu</span>}
                  name="password"
                  rules={[
                    { required: true, message: 'Vui lòng tạo mật khẩu!' },
                    { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
                  ]}
                  hasFeedback
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Nhập mật khẩu"
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <Form.Item
                  label={<span className="font-semibold text-gray-700">Xác nhận mật khẩu</span>}
                  name="confirm"
                  dependencies={['password']}
                  hasFeedback
                  rules={[
                    { required: true, message: 'Vui lòng xác nhận mật khẩu!' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }

                        return Promise.reject(new Error('Hai mật khẩu không khớp!'));
                      }
                    })
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="Nhập lại mật khẩu"
                    className="h-12 rounded-xl border-gray-200 hover:border-[#f96302] focus:border-[#f96302]"
                  />
                </Form.Item>

                <Form.Item className="mb-4 mt-2">
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="w-full bg-gradient-to-r from-[#f96302] to-red-500 hover:from-[#d85502] hover:to-red-600 border-none h-12 font-extrabold text-base rounded-xl shadow-lg shadow-orange-200"
                    loading={loading}
                  >
                    ĐĂNG KÝ NGAY
                  </Button>
                </Form.Item>

                <div className="text-center bg-gray-50 rounded-xl py-4 border border-gray-100">
                  <Text className="text-gray-500">Đã có tài khoản? </Text>
                  <Link to="/login" className="text-[#f96302] font-bold hover:underline">
                    Đăng nhập ngay
                  </Link>
                </div>
              </Form>
            </Card>

            <p className="text-center text-xs text-gray-400 mt-6">
              Bằng việc đăng ký, bạn đồng ý sử dụng Homevers theo chính sách của hệ thống.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 p-4">
      <Card
        className="w-full max-w-md shadow-2xl rounded-2xl"
        bordered={false}
      >
        <div className="text-center mb-6">
          <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserAddOutlined className="text-3xl text-[#f96302]" />
          </div>

          <Title level={3} style={{ margin: 0 }}>
            Đăng ký tài khoản
          </Title>

          <Text type="secondary">
            Tạo tài khoản để tìm phòng và lưu tin yêu thích
          </Text>
        </div>

        <Form
          form={form}
          name="register_user"
          layout="vertical"
          onFinish={onFinish}
          size="large"
          autoComplete="off"
        >
          <Form.Item
            label="Họ và tên"
            name="fullName"
            rules={[
              { required: true, message: 'Vui lòng nhập họ tên!' },
              { min: 2, message: 'Họ tên phải có ít nhất 2 ký tự!' }
            ]}
          >
            <Input
              prefix={<SmileOutlined />}
              placeholder="Nhập họ và tên"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Vui lòng nhập email!' },
              { type: 'email', message: 'Email sai định dạng!' }
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Nhập email"
              allowClear
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[
              { required: true, message: 'Vui lòng tạo mật khẩu!' },
              { min: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự!' }
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu"
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
              prefix={<LockOutlined />}
              placeholder="Nhập lại mật khẩu"
            />
          </Form.Item>

          <Form.Item className="mb-3">
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-[#f96302] hover:bg-[#d85502] border-none h-12 font-bold text-lg rounded-lg"
              loading={loading}
            >
              ĐĂNG KÝ
            </Button>
          </Form.Item>

          <div className="text-center">
            <Text>Đã có tài khoản? </Text>
            <Link to="/login" className="text-[#f96302] font-semibold hover:underline">
              Đăng nhập ngay
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
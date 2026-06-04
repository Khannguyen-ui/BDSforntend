import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Row, Col, Divider } from 'antd';
import { UserAddOutlined, LockOutlined, PhoneOutlined, MailOutlined, SmileOutlined } from '@ant-design/icons';
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
      // Chuẩn bị dữ liệu gửi lên Backend
      const payload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        role: 'USER' // Role cho Người thuê
      };

      await authService.register(payload);

      message.success("Đăng ký thành công! Hãy đăng nhập để tìm phòng.");
      navigate('/login');

    } catch (error) {
      const errorMsg = error.response?.data?.message || "Đăng ký thất bại (Email có thể đã tồn tại)";
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 to-indigo-600 p-4">
      <Card
        className="w-full max-w-lg shadow-2xl rounded-xl"
        bordered={false}
      >
        <div className="text-center mb-6">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserAddOutlined className="text-3xl text-blue-600" />
          </div>
          <Title level={3} style={{ margin: 0 }}>Đăng Ký Thành Viên</Title>
          <Text type="secondary">Tìm phòng trọ ưng ý dễ dàng & nhanh chóng</Text>
        </div>

        <Form
          form={form}
          name="register_tenant"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="fullName"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên!' }]}
          >
            <Input prefix={<SmileOutlined />} placeholder="Họ và tên của bạn" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Nhập Email!' },
                  { type: 'email', message: 'Email sai định dạng!' }
                ]}
              >
                <Input prefix={<MailOutlined />} placeholder="Email" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="phone"
                rules={[
                  { required: true, message: 'Nhập SĐT!' },
                  { pattern: /^[0-9]{10,11}$/, message: 'SĐT không hợp lệ' }
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="Số điện thoại" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Vui lòng tạo mật khẩu!' }]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Mật khẩu" />
          </Form.Item>

          <Form.Item
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
                },
              }),
            ]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Xác nhận mật khẩu" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 border-none h-12 font-bold text-lg rounded-lg"
              loading={loading}
            >
              ĐĂNG KÝ
            </Button>
          </Form.Item>

          <div className="text-center mt-2 flex flex-col gap-2">
            <div>
              <Text>Đã có tài khoản? </Text>
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Đăng nhập ngay
              </Link>
            </div>

            <Divider plain style={{ margin: '10px 0', fontSize: '12px' }}>Hoặc</Divider>

          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;
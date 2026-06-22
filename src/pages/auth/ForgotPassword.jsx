import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';

const { Title, Text } = Typography;

const ForgotPassword = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await authService.forgotPassword(values.email);
            message.success('Link đặt lại mật khẩu đã được gửi vào Email của bạn!');
        } catch (error) {
            message.error(error.response?.data?.message || 'Email không tồn tại hoặc lỗi hệ thống!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md shadow-xl rounded-2xl border-none">
                <Button 
                    type="link" 
                    icon={<ArrowLeftOutlined />} 
                    onClick={() => navigate('/login')} 
                    className="p-0 mb-4 text-gray-500 hover:text-[#f96302]"
                >
                    Quay lại đăng nhập
                </Button>
                
                <div className="text-center mb-8">
                    <Title level={2} style={{ color: '#f96302', marginBottom: 8 }}>Quên mật khẩu?</Title>
                    <Text type="secondary">
                        Chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu qua Email của bạn.
                    </Text>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không đúng định dạng!' }
                        ]}
                    >
                        <Input prefix={<MailOutlined className="text-gray-400" />} placeholder="Email của bạn" />
                    </Form.Item>

                    <Form.Item className="mb-0">
                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            loading={loading}
                            className="bg-[#f96302] border-none font-bold h-12 shadow-md hover:bg-[#d85502]"
                        >
                            GỬI YÊU CẦU
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ForgotPassword;
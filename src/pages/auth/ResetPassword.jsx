import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';

const { Title } = Typography;

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const onFinish = async (values) => {
        // 1. Kiểm tra xem token có tồn tại trên URL không
        if (!token) {
            return message.error('Không tìm thấy mã xác thực trên đường dẫn. Vui lòng nhấn lại link từ Email!');
        }

        setLoading(true);
        try {
            const response = await authService.resetPassword({
                token: token,
                newPassword: values.password
            });

            message.success('Mật khẩu của bạn đã được cập nhật thành công!');
            setTimeout(() => navigate('/login'), 2000);
        } catch (error) {
            // 🟢 CẬP NHẬT: Hiển thị đúng câu lỗi từ Backend trả về
            // Ví dụ: "Mã xác thực đã hết hạn!" hoặc "Mã xác thực không hợp lệ!"
            const errorMessage = error.response?.data?.message || 'Có lỗi xảy ra, vui lòng thử lại!';
            message.error(errorMessage);

            console.error("Chi tiết lỗi reset pass:", error.response?.data);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center min-h-screen bg-gray-50 px-4">
            <Card className="w-full max-w-md shadow-xl rounded-2xl border-none">
                <div className="text-center mb-8">
                    <Title level={2} style={{ color: '#f96302' }}>Đặt mật khẩu mới</Title>
                    <p className="text-gray-500">Vui lòng nhập mật khẩu mới có độ bảo mật cao</p>
                </div>

                <Form layout="vertical" onFinish={onFinish} size="large">
                    <Form.Item
                        label="Mật khẩu mới"
                        name="password"
                        rules={[
                            { required: true, message: 'Nhập mật khẩu mới!' },
                            { min: 6, message: 'Ít nhất 6 ký tự!' }
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Nhập mật khẩu mới" />
                    </Form.Item>

                    <Form.Item
                        label="Xác nhận mật khẩu"
                        name="confirm"
                        dependencies={['password']}
                        rules={[
                            { required: true, message: 'Xác nhận lại mật khẩu!' },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('password') === value) return Promise.resolve();
                                    return Promise.reject(new Error('Mật khẩu không khớp!'));
                                },
                            }),
                        ]}
                    >
                        <Input.Password prefix={<LockOutlined className="text-gray-400" />} placeholder="Xác nhận mật khẩu" />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            loading={loading}
                            className="bg-[#f96302] border-none font-bold h-12 shadow-md hover:bg-[#d85502]"
                        >
                            CẬP NHẬT MẬT KHẨU
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default ResetPassword;
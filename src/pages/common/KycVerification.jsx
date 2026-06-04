import React, { useState, useEffect } from 'react';
import {
    Card, Form, Input, Button, Upload, App, Typography,
    Row, Col, Steps, Alert, Image, Spin, Modal
} from 'antd';
import {
    UploadOutlined, IdcardOutlined, CheckCircleOutlined,
    LoadingOutlined, ScanOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import authService from '../../services/authService';
import useAuth from '../../hooks/useAuth';

const { Title, Text } = Typography;
const { Step } = Steps;

const KycVerification = () => {
    const { user, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [form] = Form.useForm();
    const { message } = App.useApp();

    // State
    const [loading, setLoading] = useState(false);
    const [frontFile, setFrontFile] = useState(null);
    const [backFile, setBackFile] = useState(null);
    const [ocrLoading, setOcrLoading] = useState(false); // Loading khi đang quét ảnh
    const [frontImage, setFrontImage] = useState(null);  // URL ảnh mặt trước
    const [backImage, setBackImage] = useState(null);    // URL ảnh mặt sau
    const [formData, setFormData] = useState({ kycToken: '' });

    // Kiểm tra trạng thái User khi vào trang
    useEffect(() => {
        if (user?.kycStatus === 'VERIFIED') {
            message.success("Tài khoản của bạn đã được xác minh!");
        }
    }, [user]);

    // --- XỬ LÝ UPLOAD ẢNH MẶT TRƯỚC (CÓ OCR) ---
    const handleFrontUpload = async ({ file, onSuccess }) => {
        setFrontFile(file);
        setOcrLoading(true);
        try {
            // 1. Upload lên Cloudinary trước để lấy URL hiển thị
            const uploadRes = await userService.uploadFile(file);
            const imageUrl = uploadRes.data.result;
            setFrontImage(imageUrl);

            // 2. OCR
            const ocrRes = await userService.extractIdCard(file);
            const ocrData = ocrRes.data.result;

            if (ocrData) {
                // ✅ Cập nhật kycToken để dùng cho bước Submit cuối cùng
                setFormData({ kycToken: ocrData.kycToken });

                // ✅ Tự động điền vào Form (Phải khớp với thuộc tính 'name' trong Form.Item)
                form.setFieldsValue({
                    citizenId: ocrData.citizenId,
                    fullName: ocrData.fullName,
                    address: ocrData.address || "Thông tin địa chỉ"
                });

                message.success("OCR thành công!");
            }
            onSuccess("ok");
        } catch (error) {
            message.error(error.response?.data?.message || "OCR thất bại");
        } finally {
            setOcrLoading(false);
        }
    };

    // --- XỬ LÝ UPLOAD ẢNH MẶT SAU (KHÔNG CẦN OCR) ---
    const handleBackUpload = async ({ file, onSuccess }) => {
        setBackFile(file); // ✅ Lưu file gốc
        try {
            const res = await userService.uploadFile(file);
            const imageUrl = res.data.result;
            setBackImage(imageUrl);
            message.success("Tải mặt sau thành công")
            onSuccess("ok");
        } catch (error) {
            message.error("Upload mặt sau thất bại");
        }
    };

    // --- GỬI FORM ---
    const onFinish = async (values) => {
        if (!frontImage || !backImage) {
            return message.error("Vui lòng tải lên đủ 2 mặt ảnh CCCD!");
        }

        setLoading(true);
        try {
            const res = await userService.submitKyc(
                formData.kycToken,  // Từ OCR response
                values.citizenId,
                values.fullName,
                values.address || "Không có thông tin",
                frontFile,  // File gốc mặt trước
                backFile    // File gốc mặt sau
            );

            const userSessionId = sessionStorage.getItem('userSessionId');

            // 1. Cập nhật lại phiên làm việc nếu Backend trả về token mới ngay trong kết quả submit
            const resultData = res?.data?.result;
            if (resultData && resultData.token) {
                if (userSessionId) {
                    sessionStorage.setItem(`${userSessionId}_accessToken`, resultData.token);
                    sessionStorage.setItem(`${userSessionId}_role`, resultData.role);
                    sessionStorage.setItem(`${userSessionId}_fullName`, resultData.fullName);
                    sessionStorage.setItem(`${userSessionId}_userId`, resultData.id);
                    sessionStorage.setItem(`${userSessionId}_email`, resultData.email);
                }
            }

            // 2. Gọi API lấy Profile mới nhất để kiểm tra trạng thái KYC được tự động duyệt tức thì bởi AI
            const profileRes = await userService.getProfile();
            const updatedProfile = profileRes.data?.result || profileRes.data || {};

            if (updatedProfile.kycStatus === 'VERIFIED') {
                // Tự động nâng quyền ngầm: Gọi API Refresh Token
                const oldToken = sessionStorage.getItem(`${userSessionId}_accessToken`);
                let newToken = null;
                try {
                    const refreshRes = await authService.refreshToken(oldToken);
                    const refreshResult = refreshRes.data?.result || refreshRes.data;
                    newToken = refreshResult?.token || refreshResult?.accessToken;

                    if (newToken) {
                        sessionStorage.setItem(`${userSessionId}_accessToken`, newToken);
                        sessionStorage.setItem(`${userSessionId}_role`, 'OWNER');
                    }
                } catch (refreshErr) {
                    console.warn("Lỗi refresh token, tiếp tục bằng token hiện tại:", refreshErr);
                }

                await refreshProfile();

                // Hiển thị Modal chúc mừng định danh tự động thành công!
                Modal.success({
                    title: (
                        <div className="text-green-600 font-bold text-lg flex items-center gap-2">
                            🎉 ĐỊNH DANH THÀNH CÔNG TỰ ĐỘNG!
                        </div>
                    ),
                    content: (
                        <div className="space-y-3 mt-2">
                            <p className="font-medium text-gray-700">Hệ thống AI đã tự động xác minh thông tin giấy tờ của bạn thành công!</p>
                            <p className="text-gray-600 text-sm">
                                Tài khoản của bạn đã được nâng cấp lên nhóm quyền <b>Mô giới (OWNER)</b>.. Bây giờ bạn có thể ngay lập tức đăng tin, đẩy tin và quản lý phòng trọ của mình.
                            </p>
                            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center text-xs text-green-700 font-semibold">
                                Hệ thống sẽ chuyển hướng và làm mới bảng điều khiển.
                            </div>
                        </div>
                    ),
                    okText: "Bắt đầu ngay",
                    okButtonProps: { className: "bg-green-600 border-green-600 text-white font-bold" },
                    centered: true,
                    onOk: () => {
                        window.location.href = '/landlord/dashboard';
                    }
                });
            } else {
                message.success("Gửi hồ sơ thành công! Đang chờ phê duyệt.");
                await refreshProfile();
                navigate('/profile');
            }
        } catch (error) {
            message.error(error.response?.data?.message || "Gửi hồ sơ thất bại.");
        } finally {
            setLoading(false);
        }
    };

    // --- GIAO DIỆN KHI ĐÃ VERIFIED HOẶC PENDING ---
    if (user?.kycStatus === 'VERIFIED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <CheckCircleOutlined className="text-green-500 text-6xl mb-4" />
                <Title level={3}>Tài khoản đã được định danh</Title>
                <Text type="secondary">Bạn có thể sử dụng toàn bộ tính năng của hệ thống.</Text>
                <Button type="primary" className="mt-6" onClick={() => navigate('/')}>
                    Về trang chủ
                </Button>
            </div>
        );
    }

    if (user?.kycStatus === 'PENDING') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <LoadingOutlined className="text-blue-500 text-6xl mb-4" />
                <Title level={3}>Hồ sơ đang chờ duyệt</Title>
                <Text type="secondary" className="text-center max-w-md">
                    Admin đang kiểm tra thông tin của bạn. Quá trình này thường mất từ 1-24 giờ.
                    Vui lòng quay lại sau.
                </Text>
                <Button className="mt-6" onClick={() => navigate('/profile')}>
                    Quay về Hồ sơ
                </Button>
            </div>
        );
    }

    // --- GIAO DIỆN FORM CHÍNH ---
    return (
        <div className="max-w-3xl mx-auto p-6">
            <Card className="shadow-lg rounded-xl border-t-4 border-blue-600">
                <div className="text-center mb-8">
                    <Title level={2}>Xác Minh Danh Tính (eKYC)</Title>
                    <Text type="secondary">Sử dụng công nghệ AI để tự động nhận diện thông tin</Text>
                </div>

                {/* Thông báo nếu bị từ chối trước đó */}
                {user?.kycStatus === 'REJECTED' && (
                    <Alert
                        message="Yêu cầu trước đó bị từ chối"
                        description="Ảnh của bạn không rõ nét hoặc thông tin không khớp. Vui lòng thử lại."
                        type="error"
                        showIcon
                        className="mb-6"
                    />
                )}

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{ fullName: user?.fullName }} // Điền sẵn tên từ profile nếu có
                >
                    <Row gutter={32}>
                        {/* Cột Trái: Upload Ảnh */}
                        <Col span={24} md={12}>
                            <Form.Item label="1. Ảnh mặt trước (Có AI quét)" required>
                                <Upload.Dragger
                                    customRequest={handleFrontUpload}
                                    showUploadList={false}
                                    accept="image/*"
                                    className="bg-gray-50"
                                >
                                    {frontImage ? (
                                        <div className="relative group">
                                            <Image src={frontImage} alt="Front" preview={false} className="max-h-48 object-contain rounded" />
                                            <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white">
                                                Nhấn để thay đổi
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4">
                                            {ocrLoading ? <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} /> : <ScanOutlined className="text-3xl text-blue-500" />}
                                            <p className="ant-upload-text mt-2">Tải ảnh mặt trước</p>
                                            <p className="ant-upload-hint text-xs text-gray-400">Hệ thống sẽ tự động đọc số CCCD</p>
                                        </div>
                                    )}
                                </Upload.Dragger>
                            </Form.Item>

                            <Form.Item label="2. Ảnh mặt sau" required>
                                <Upload.Dragger
                                    customRequest={handleBackUpload}
                                    showUploadList={false}
                                    accept="image/*"
                                >
                                    {backImage ? (
                                        <Image src={backImage} alt="Back" preview={false} className="max-h-48 object-contain rounded" />
                                    ) : (
                                        <div className="p-4">
                                            <UploadOutlined className="text-3xl text-gray-400" />
                                            <p className="ant-upload-text mt-2">Tải ảnh mặt sau</p>
                                        </div>
                                    )}
                                </Upload.Dragger>
                            </Form.Item>
                        </Col>

                        {/* Cột Phải: Form thông tin */}
                        <Col span={24} md={12}>
                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                <h4 className="font-bold text-blue-800 mb-2 flex items-center">
                                    <IdcardOutlined className="mr-2" /> Thông tin trích xuất
                                </h4>
                                <Text className="text-xs text-gray-600">
                                    Thông tin dưới đây được AI đọc tự động. Vui lòng kiểm tra kỹ và chỉnh sửa nếu sai sót.
                                </Text>
                            </div>

                            <Form.Item
                                name="citizenId"
                                label="Số Căn cước công dân"
                                rules={[
                                    { required: true, message: "Vui lòng nhập số CCCD" },
                                    { pattern: /^[0-9]{9,12}$/, message: "Số CCCD không hợp lệ" }
                                ]}
                            >
                                <Input size="large" placeholder="Sẽ tự động điền..." />
                            </Form.Item>

                            <Form.Item
                                name="fullName"
                                label="Họ và Tên (Trên thẻ)"
                                rules={[{ required: true, message: "Vui lòng nhập họ tên" }]}
                            >
                                <Input size="large" placeholder="NGUYEN VAN A" />
                            </Form.Item>

                            <Alert
                                type="warning"
                                showIcon
                                messageApi="Lưu ý"
                                description="Việc sử dụng giấy tờ giả mạo sẽ dẫn đến việc khóa tài khoản vĩnh viễn."
                                className="mt-4"
                            />

                            <Button
                                type="primary"
                                htmlType="submit"
                                size="large"
                                block
                                className="mt-6 h-12 text-lg font-bold bg-blue-600 hover:bg-blue-500"
                                loading={loading}
                                disabled={ocrLoading} // Không cho gửi khi đang quét
                            >
                                GỬI YÊU CẦU XÁC MINH
                            </Button>
                        </Col>
                    </Row>
                </Form>
            </Card>
        </div>
    );
};

export default KycVerification;
import React, { useEffect, useState } from 'react';
import { Button, Result, Card, Typography, Descriptions, Divider, Progress } from 'antd';
import { HomeOutlined, HistoryOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 1. Khởi tạo bộ đếm ngược (ví dụ 5 giây)
  const [countdown, setCountdown] = useState(5);

  const amount = searchParams.get('amount') || '0';
  const txnRef = searchParams.get('txnRef') || 'N/A';
  const date = dayjs().format('DD/MM/YYYY HH:mm:ss');

  // 2. Logic tự động chuyển hướng
  useEffect(() => {
    // Nếu đếm ngược về 0 thì chuyển hướng
    if (countdown === 0) {
      navigate('/landlord/finance');
      return;
    }

    // Thiết lập đếm ngược mỗi giây
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    // Xóa timer khi component unmount
    return () => clearInterval(timer);
  }, [countdown, navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', minHeight: '80vh' }}>
      <Card className="shadow-lg" style={{ maxWidth: 600, width: '100%', borderRadius: 16 }}>
        <Result
          status="success"
          title={<Title level={2} style={{ color: '#52c41a' }}>Thanh toán thành công!</Title>}
          subTitle={
            <div>
              <p>Số dư ví của bạn đã được cập nhật tự động vào hệ thống.</p>
              <Text type="secondary">
                Hệ thống sẽ tự động quay lại trang Quản lý tài chính sau <Text strong color="red">{countdown}</Text> giây... <LoadingOutlined />
              </Text>
            </div>
          }
          extra={[
            <Button
              key="home"
              size="large"
              icon={<HomeOutlined />}
              onClick={() => navigate('/')}
              style={{ color: '#f96302', borderColor: '#f96302' }}
            >
              Về trang chủ
            </Button>,
            <Button 
              type="primary"
              key="history" 
              size="large" 
              icon={<HistoryOutlined />} 
              onClick={() => navigate('/landlord/finance')}
              style={{ backgroundColor: '#f96302', borderColor: '#f96302', color: '#fff' }}
            >
              Kiểm tra ví ngay
            </Button>,
          ]}
        >
          {/* Thanh tiến trình đếm ngược để tăng trải nghiệm người dùng */}
          <Progress
            percent={(countdown / 5) * 100}
            showInfo={false}
            strokeColor="#52c41a"
            size="small"
            style={{ marginBottom: 20 }}
          />

          <div style={{ background: '#fafafa', padding: '20px', borderRadius: '8px' }}>
            <Descriptions title="Chi tiết giao dịch" column={1} bordered size="small">
              <Descriptions.Item label="Số tiền nạp">
                <span style={{ color: '#3f8600', fontWeight: 'bold' }}>
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="Mã giao dịch">{txnRef}</Descriptions.Item>
              <Descriptions.Item label="Thời gian">{date}</Descriptions.Item>
            </Descriptions>
          </div>
        </Result>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
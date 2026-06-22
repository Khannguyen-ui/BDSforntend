import React, { useEffect, useState } from 'react';
import { Button, Result, Card, Typography, Progress } from 'antd';
import { CloseCircleFilled, HomeOutlined, RedoOutlined, LoadingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Text, Title } = Typography;

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8); // Để thời gian chờ lâu hơn một chút (8s) để khách đọc lỗi

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/landlord/finance'); // Tự động đẩy về trang tài chính để thử lại
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', minHeight: '80vh' }}>
      <Card className="shadow-lg" style={{ maxWidth: 600, width: '100%', borderRadius: 16 }}>
        <Result
          status="error"
          title={<Title level={2} style={{ color: '#ff4d4f' }}>Thanh toán thất bại!</Title>}
          subTitle={
            <div>
              <p>Giao dịch của bạn đã bị hủy hoặc gặp sự cố kỹ thuật.</p>
              <Text type="secondary">
                Hệ thống sẽ tự động quay lại trang nạp tiền sau <Text strong color="red">{countdown}</Text> giây... <LoadingOutlined />
              </Text>
            </div>
          }
          extra={[
            <Button 
              type="primary"
              key="retry" 
              size="large" 
              icon={<RedoOutlined />} 
              onClick={() => navigate('/landlord/finance')} 
              style={{ backgroundColor: '#f96302', borderColor: '#f96302', color: '#fff' }}
            >
              Thử lại ngay
            </Button>,
            <Button 
              key="home" 
              size="large" 
              icon={<HomeOutlined />} 
              onClick={() => navigate('/')}
              style={{ color: '#f96302', borderColor: '#f96302' }}
            >
              Về trang chủ
            </Button>,
          ]}
        >
          <Progress
            percent={(countdown / 8) * 100}
            showInfo={false}
            strokeColor="#ff4d4f"
            size="small"
            style={{ marginBottom: 20 }}
          />

          <div style={{ background: '#fff1f0', padding: '20px', borderRadius: '8px', border: '1px solid #ffa39e' }}>
            <Title level={5}>Nguyên nhân có thể do:</Title>
            <ul style={{ textAlign: 'left', color: '#666' }}>
              <li>Bạn đã chủ động hủy giao dịch trên cổng VNPay.</li>
              <li>Số dư tài khoản ngân hàng không đủ.</li>
              <li>Hết thời gian chờ thanh toán (Timeout).</li>
              <li>Thông tin thẻ/tài khoản chưa chính xác.</li>
            </ul>
          </div>
        </Result>
      </Card>
    </div>
  );
};

export default PaymentFailed;
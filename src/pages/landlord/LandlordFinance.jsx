import React, { useEffect, useState } from 'react';
import {
  Tabs, Card, Statistic, Button, Table, Tag, List,
  Avatar, InputNumber, message as staticMessage, Typography, Row, Col, Badge, Space, App
} from 'antd';
import {
  WalletOutlined, BellOutlined, HistoryOutlined,
  CheckCircleOutlined, CreditCardOutlined,
  ArrowDownOutlined, ArrowUpOutlined, RocketOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import paymentService from '../../services/paymentService';
import walletService from '../../services/walletService';
import notificationService from '../../services/notificationService';
import useAuth from '../../hooks/useAuth';

dayjs.extend(relativeTime);
const { Title, Text } = Typography;

const LandlordFinance = () => {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [activeTab, setActiveTab] = useState('1');

  // --- STATE VÍ TIỀN ---
  const [balance, setBalance] = useState(0);
  const [holdBalance, setHoldBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [depositAmount, setDepositAmount] = useState(50000);
  const [loadingPay, setLoadingPay] = useState(false);

  // --- STATE THÔNG BÁO ---
  const [notifications, setNotifications] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(false);

  // === 1. LOGIC VÍ & THANH TOÁN ===
  const fetchWalletData = async () => {
    if (!user?.id) return;
    try {
      const [walletRes, historyRes] = await Promise.all([
        walletService.getMyWallet(),
        paymentService.getMyHistory(user.id)
      ]);

      const wallet = walletRes.data?.result || walletRes.data?.data || walletRes.data || {};
      const totalBalance = wallet.balance || 0;
      const frozenBalance = wallet.holdBalance || 0;
      const usableBalance = totalBalance - frozenBalance;

      setBalance(totalBalance);
      setHoldBalance(frozenBalance);
      setAvailableBalance(usableBalance);

      const rawHistory = historyRes.data?.result || historyRes.data || [];
      const historyArr = Array.isArray(rawHistory) ? rawHistory : (rawHistory?.content || []);
      
      // Cập nhật state UI bảng lịch sử giao dịch
      setTransactions(historyArr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error("Lỗi tải dữ liệu ví", error);
    }
  };

  const handleDeposit = async () => {
    if (depositAmount < 10000) {
      return message.warning("Số tiền nạp tối thiểu là 10,000 VNĐ");
    }
    setLoadingPay(true);
    try {
      const res = await paymentService.createPaymentUrl(depositAmount, user.id);
      if (res.data && res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (error) {
      message.error("Không thể tạo giao dịch. Vui lòng thử lại.");
      setLoadingPay(false);
    }
  };

  // 🟢 CẬP NHẬT CỘT GIAO DỊCH ĐỂ NHẬN DIỆN "ĐẨY TIN"
  const transactionColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Loại giao dịch',
      dataIndex: 'type',
      key: 'type',
      render: (type) => {
        let color = 'default';
        let text = type;
        let icon = null;
        
        if (type === 'DEPOSIT') {
          color = 'green';
          text = 'Nạp tiền vào ví';
        } else if (type === 'PURCHASE_PACKAGE' || type === 'MEMBERSHIP') {
          color = 'purple';
          text = 'Mua gói Hội Viên';
        } else if (type === 'ROOM_PROMOTION' || type === 'PUSH_ROOM') { // 🟢 LOGIC MỚI
          color = 'blue';
          text = 'Đẩy tin lên Top';
          icon = <RocketOutlined className="mr-1"/>;
        } else if (type === 'DEDUCTION' || type === 'POST_FEE') {
          color = 'orange';
          text = 'Phí dịch vụ';
        }

        return <Tag color={color} className="font-medium flex items-center w-fit">{icon} {text}</Tag>;
      }
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount, record) => {
        const isExpense = ['PURCHASE_PACKAGE', 'MEMBERSHIP', 'ROOM_PROMOTION', 'PUSH_ROOM', 'DEDUCTION', 'POST_FEE'].includes(record.type);
        const displayAmount = isExpense ? -Math.abs(amount) : Math.abs(amount);
        return (
          <span className={`font-bold ${displayAmount >= 0 ? "text-green-600" : "text-red-600"}`}>
            {displayAmount > 0 ? '+' : ''}
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayAmount)}
          </span>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'SUCCESS' ? 'success' : 'error'} variant="filled">
          {status === 'SUCCESS' ? 'Thành công' : 'Thất bại'}
        </Tag>
      )
    }
  ];

  // === 2. LOGIC THÔNG BÁO (ĐÃ CẬP NHẬT) ===
  const fetchNotifications = async () => {
    setLoadingNoti(true);
    try {
      const res = await notificationService.getMyNotifications();
      const rawData = res.data?.result || res.data || [];
      const allData = Array.isArray(rawData) ? rawData : (rawData?.content || []);
      
      // Bộ lọc: Thông báo tài chính
      const financialNotis = allData.filter(n => {
        const type = n.type || '';
        const title = (n.title || '').toLowerCase();
        const financialTypes = ['BILL_NEW', 'DEPOSIT', 'PAYMENT', 'PURCHASE_PACKAGE', 'DEDUCTION', 'ROOM_PROMOTION', 'PUSH_ROOM'];
        const keywords = ['nạp tiền', 'thanh toán', 'gói vip', 'trừ tiền', 'đẩy tin', 'lên top', 'gia hạn'];
        return financialTypes.includes(type) || keywords.some(k => title.includes(k));
      });

      setNotifications(financialNotis);
    } catch (error) {
      console.error("Lỗi tải thông báo tài chính", error);
    } finally {
      setLoadingNoti(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchWalletData();
    fetchNotifications();
  }, []);

  const items = [
    {
      key: '1',
      label: (<span><WalletOutlined /> Quản lý Ví & Nạp tiền</span>),
      children: (
        <div className="space-y-6">
          <Row gutter={[16, 16]}>
            {/* Cột trái: 3 chỉ số tài chính */}
            <Col xs={24} lg={14}>
              <Row gutter={[12, 12]}>
                {/* 🟢 Số dư khả dụng - TRỌNG TÂM TRỰC QUAN */}
                <Col span={24}>
                  <Card variant="borderless" className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md rounded-2xl p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs opacity-90 font-medium uppercase tracking-wider block mb-1">Số dư khả dụng</span>
                        <h2 className="text-3xl font-extrabold text-white mb-1">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(availableBalance)}
                        </h2>
                        <span className="text-[11px] bg-white/20 px-2 py-0.5 rounded-full inline-block mt-1 font-semibold">
                          Sử dụng thanh toán đẩy tin & gói VIP
                        </span>
                      </div>
                      <div className="bg-white/20 p-4 rounded-full flex items-center justify-center">
                        <WalletOutlined style={{ fontSize: '32px' }} className="text-white" />
                      </div>
                    </div>
                  </Card>
                </Col>

                {/* 🟢 Số dư tạm giữ */}
                <Col span={12}>
                  <Card variant="borderless" className="bg-amber-50 border-l-4 border-amber-500 shadow-sm rounded-xl h-full py-3">
                    <Statistic
                      title={<span className="text-xs text-amber-800 font-semibold uppercase tracking-wider">Số dư tạm giữ</span>}
                      value={holdBalance}
                      precision={0}
                      valueStyle={{ color: '#d97706', fontWeight: 'bold', fontSize: '18px' }}
                      prefix={<ClockCircleOutlined className="text-amber-500 mr-1" />}
                      suffix=" đ"
                    />
                    <span className="text-[10px] text-amber-600 italic mt-1 block">Giao dịch đang chờ xử lý</span>
                  </Card>
                </Col>

                {/* 🟢 Tổng số dư */}
                <Col span={12}>
                  <Card variant="borderless" className="bg-blue-50 border-l-4 border-blue-500 shadow-sm rounded-xl h-full py-3">
                    <Statistic
                      title={<span className="text-xs text-blue-800 font-semibold uppercase tracking-wider">Tổng số dư ví</span>}
                      value={balance}
                      precision={0}
                      valueStyle={{ color: '#2563eb', fontWeight: 'bold', fontSize: '18px' }}
                      prefix={<WalletOutlined className="text-blue-500 mr-1" />}
                      suffix=" đ"
                    />
                    <span className="text-[10px] text-blue-600 italic mt-1 block">Tổng tài sản trong ví của bạn</span>
                  </Card>
                </Col>
              </Row>
            </Col>

            {/* Cột phải: Nạp tiền ví */}
            <Col xs={24} lg={10}>
              <Card title={<span className="font-bold text-sm text-gray-700">Nạp tiền vào ví (Qua VNPay)</span>} variant="borderless" className="shadow-sm rounded-2xl h-full flex flex-col justify-between" bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" className="block mb-3 text-xs">
                    Nhập số tiền muốn nạp (Tối thiểu 10.000 VNĐ)
                  </Text>
                  <Space.Compact style={{ width: '100%' }} className="mb-4">
                    <InputNumber
                      className="w-full"
                      value={depositAmount}
                      step={10000}
                      min={10000}
                      onChange={(val) => setDepositAmount(val)}
                      formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={value => value.replace(/\$\s?|(,*)/g, '')}
                      style={{ height: '40px', display: 'flex', alignItems: 'center' }}
                    />
                    <Button
                      type="primary"
                      icon={<CreditCardOutlined />}
                      loading={loadingPay}
                      onClick={handleDeposit}
                      className="bg-blue-600"
                      style={{ height: '40px' }}
                    >
                      Nạp tiền
                    </Button>
                  </Space.Compact>
                </div>
                <Text type="secondary" className="block text-[11px] italic bg-gray-50 p-2 rounded-lg border border-gray-100">
                  * Hệ thống sẽ chuyển hướng sang cổng thanh toán VNPay được mã hóa bảo mật 256-bit để thực hiện giao dịch nạp tiền.
                </Text>
              </Card>
            </Col>
          </Row>

          <Card title={<><HistoryOutlined /> Lịch sử biến động số dư</>} className="shadow-sm rounded-xl">
            <Table
              dataSource={transactions}
              columns={transactionColumns}
              rowKey="id"
              pagination={{ pageSize: 6 }}
            />
          </Card>
        </div>
      ),
    },
    {
      key: '2',
      label: (
        <span>
          <BellOutlined /> Thông báo tài chính <Badge count={notifications.filter(n => !n.read).length} offset={[5, 0]} size="small" />
        </span>
      ),
      children: (
        <Card className="shadow-sm rounded-xl">
          <List
            itemLayout="horizontal"
            loading={loadingNoti}
            dataSource={notifications}
            renderItem={(item) => {
              // 🟢 XÁC ĐỊNH CHIỀU GIAO DỊCH: Đẩy tin (ROOM_PROMOTION) là Chi tiêu (Màu đỏ)
              const isExpense = ['PURCHASE_PACKAGE', 'DEDUCTION', 'POST_FEE', 'ROOM_PROMOTION', 'PUSH_ROOM'].includes(item.type) 
                                || (item.title && (item.title.toLowerCase().includes('trừ') || item.title.toLowerCase().includes('thanh toán')));
              
              return (
                <List.Item
                  actions={[
                    !item.read && (
                      <Button type="link" size="small" onClick={() => handleMarkRead(item.id)}>
                        Đã đọc
                      </Button>
                    )
                  ]}
                  className={`transition-all ${!item.read ? "bg-blue-50/50" : ""} px-4 rounded-lg mb-2`}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        icon={isExpense ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                        style={{ backgroundColor: isExpense ? '#ff4d4f' : '#52c41a' }}
                      />
                    }
                    title={
                      <div className="flex justify-between">
                        <span className={!item.read ? "font-bold" : ""}>{item.title}</span>
                        <Text type="secondary" className="text-xs">
                          {dayjs(item.createdAt).fromNow()}
                        </Text>
                      </div>
                    }
                    description={
                        <div>
                            {item.message}
                            {/* Nếu là đẩy tin, hiện thêm icon tên lửa cho đẹp */}
                            {item.type === 'ROOM_PROMOTION' && <Tag color="blue" className="ml-2 text-[10px]"><RocketOutlined/> Đẩy tin</Tag>}
                        </div>
                    }
                  />
                </List.Item>
              );
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="mb-6">
        <Title level={3} className="m-0 text-blue-800">Trung tâm Tài chính</Title>
        <Text type="secondary">Theo dõi số dư, nạp tiền và quản lý các giao dịch nâng cấp VIP.</Text>
      </div>
      <Tabs 
        defaultActiveKey="1" 
        items={items} 
        onChange={setActiveTab} 
        size="large" 
        className="bg-white p-4 rounded-xl shadow-sm"
      />
    </div>
  );
};

export default LandlordFinance;
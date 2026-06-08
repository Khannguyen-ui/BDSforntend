import React, { useEffect, useState } from 'react';
import {
    Row, Col, Card, Button, Typography, Tag, Skeleton, Empty,
    Statistic, List, Avatar, Progress, Tooltip, Divider, Badge
} from 'antd';
import {
    FileTextOutlined, UserOutlined, CrownOutlined, WalletOutlined,
    HomeOutlined, ClockCircleOutlined, CheckCircleOutlined,
    FireFilled, RiseOutlined, PlusCircleOutlined, RightOutlined,
    HeartOutlined, EyeOutlined, CalendarOutlined, StarOutlined,
    ReloadOutlined, BellOutlined, DollarOutlined, BarChartOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

import roomService from '../../services/roomService';
import appointmentService from '../../services/appointmentService';
import walletService from '../../services/walletService';
import notificationService from '../../services/notificationService';
import useAuth from '../../hooks/useAuth';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const formatCurrency = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

const LandlordDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [rooms, setRooms] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotif, setUnreadNotif] = useState(0);


    const [totalLikesFromAPI, setTotalLikesFromAPI] = useState(0);
    const [totalSavesFromAPI, setTotalSavesFromAPI] = useState(0);
    const [totalViewsFromAPI, setTotalViewsFromAPI] = useState(0);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [roomRes, apptRes, walletRes, txRes, notifRes] = await Promise.allSettled([
                roomService.getMyRooms(),
                appointmentService.getMyCalendar(),
                walletService.getMyWallet(),
                walletService.getMyTransactions(0, 50),
                notificationService.getMyNotifications(),
            ]);

            // Rooms
            let roomArr = [];
            if (roomRes.status === 'fulfilled') {
                const raw = roomRes.value.data;
                roomArr = Array.isArray(raw) ? raw : (raw?.content || raw?.result?.content || []);
            }
            setRooms(roomArr);
            if (roomArr.length > 0) {
                const totalViews = roomArr.reduce((sum, r) => {
                    return sum + Number(r.viewCount ?? r.views ?? r.totalViews ?? 0);
                }, 0);

                const totalLikes = roomArr.reduce((sum, r) => {
                    return sum + Number(r.likeCount ?? r.likes ?? r.totalLikes ?? 0);
                }, 0);

                const totalSaves = roomArr.reduce((sum, r) => {
                    return sum + Number(r.saveCount ?? r.saves ?? r.totalSaves ?? 0);
                }, 0);

                setTotalViewsFromAPI(totalViews);
                setTotalLikesFromAPI(totalLikes);
                setTotalSavesFromAPI(totalSaves);
            } else {
                setTotalViewsFromAPI(0);
                setTotalLikesFromAPI(0);
                setTotalSavesFromAPI(0);
            }
            if (apptRes.status === 'fulfilled') {
                const raw = apptRes.value.data;
                const arr = Array.isArray(raw) ? raw : (raw?.content || raw?.result || []);
                setAppointments(arr);
            }

            // Wallet
            if (walletRes.status === 'fulfilled') {
                const raw = walletRes.value.data;
                setWallet(raw?.result || raw?.data || raw);
            }

            // Transactions
            if (txRes.status === 'fulfilled') {
                const raw = txRes.value.data;
                const arr = Array.isArray(raw) ? raw : (raw?.result?.content || raw?.content || raw?.result || []);
                setTransactions(arr);
            }

            // Notifications
            if (notifRes.status === 'fulfilled') {
                const raw = notifRes.value.data;
                const arr = Array.isArray(raw) ? raw : (raw?.result?.content || raw?.content || raw?.result || []);
                setNotifications(arr.slice(0, 5));
                setUnreadNotif(arr.filter(n => !n.isRead && !n.read).length);
            }
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    // --- Tính toán thống kê từ dữ liệu thật ---
    const activeRooms = rooms.filter(r => r.status === 'ACTIVE').length;
    const pendingRooms = rooms.filter(r => r.status === 'PENDING').length;
    const promotedRooms = rooms.filter(r => r.isPromoted).length;
    const totalLikes = totalLikesFromAPI;
    const totalSaves = totalSavesFromAPI;
    const totalViews = totalViewsFromAPI;

    // Lịch hẹn sắp tới (trong 7 ngày)
    const upcomingAppts = appointments
        .filter(a => dayjs(a.appointmentDate || a.scheduledAt).isAfter(dayjs()))
        .sort((a, b) => dayjs(a.appointmentDate || a.scheduledAt).diff(dayjs(b.appointmentDate || b.scheduledAt)))
        .slice(0, 3);

    // Giao dịch gần đây
    const recentTx = transactions.slice(0, 5);

    // Số dư khả dụng
    const balance = wallet?.balance || 0;
    const holdBalance = wallet?.holdBalance || 0;
    const availableBalance = balance - holdBalance;
    const getTxType = (tx) => {
        return String(tx.transactionType || tx.type || '').toUpperCase();
    };

    const getTxAmount = (tx) => {
        return Number(tx.amount || 0);
    };

    const isPositiveTx = (tx) => {
        const amount = getTxAmount(tx);
        const type = getTxType(tx);

        if (amount > 0) return true;
        if (amount < 0) return false;

        return ['DEPOSIT', 'REFUND', 'RELEASE'].includes(type);
    };
    const thisMonthDeposit = transactions
        .filter(tx =>
            getTxType(tx) === 'DEPOSIT' &&
            ['SUCCESS', 'COMPLETED'].includes(String(tx.status || '').toUpperCase()) &&
            dayjs(tx.createdAt).isSame(dayjs(), 'month')
        )
        .reduce((s, tx) => s + Math.abs(getTxAmount(tx)), 0);

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'green';
            case 'PENDING': return 'orange';
            case 'REJECTED': return 'red';
            case 'HIDDEN': return 'default';
            default: return 'blue';
        }
    };

    const getStatusLabel = (status) => {
        const map = { ACTIVE: 'Đang hiển thị', PENDING: 'Chờ duyệt', REJECTED: 'Bị từ chối', HIDDEN: 'Đã ẩn' };
        return map[status] || status;
    };

    const getTxColor = (tx) => {
        return isPositiveTx(tx) ? '#52c41a' : '#f5222d';
    };

    const getTxLabel = (tx) => {
        const type = getTxType(tx);

        const map = {
            DEPOSIT: 'Nạp tiền',
            DEBIT: 'Trừ tiền',
            HOLD: 'Đóng băng',
            RELEASE: 'Hoàn tiền',
            PAYMENT_CONFIRMED: 'Thanh toán',
            REFUND: 'Hoàn lại'
        };

        return map[type] || type || 'Giao dịch ví';
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        👋 Xin chào, {user?.fullName?.split(' ').pop() || 'Chủ trọ'}!
                    </Title>
                    <Text type="secondary">Cập nhật lúc {dayjs().format('HH:mm, DD/MM/YYYY')}</Text>
                </div>
                <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>
                    Làm mới
                </Button>
            </div>

            {/* --- STAT CARDS --- */}
            <Row gutter={[16, 16]} className="mb-6">
                <Col xs={12} sm={12} md={6}>
                    <Card className="shadow-sm rounded-xl border-0" style={{ borderTop: '3px solid #52c41a' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                            <Statistic
                                title={<span className="text-xs text-gray-500">Tin đang hiển thị</span>}
                                value={activeRooms}
                                prefix={<CheckCircleOutlined className="text-green-500" />}
                                valueStyle={{ color: '#52c41a', fontWeight: 700 }}
                            />
                            <Text type="secondary" className="text-xs">/ Tổng {rooms.length} tin</Text>
                        </Skeleton>
                    </Card>
                </Col>

                <Col xs={12} sm={12} md={6}>
                    <Card className="shadow-sm rounded-xl border-0" style={{ borderTop: '3px solid #faad14' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                            <Statistic
                                title={<span className="text-xs text-gray-500">Chờ duyệt</span>}
                                value={pendingRooms}
                                prefix={<ClockCircleOutlined className="text-yellow-500" />}
                                valueStyle={{ color: '#faad14', fontWeight: 700 }}
                            />
                            <Button type="link" className="p-0 text-xs text-yellow-500"
                                onClick={() => navigate('/landlord/room-list')}>
                                Xem danh sách <RightOutlined style={{ fontSize: 10 }} />
                            </Button>
                        </Skeleton>
                    </Card>
                </Col>

                <Col xs={12} sm={12} md={6}>
                    <Card className="shadow-sm rounded-xl border-0" style={{ borderTop: '3px solid #722ed1' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                            <Statistic
                                title={<span className="text-xs text-gray-500">Số dư khả dụng</span>}
                                value={availableBalance}
                                formatter={v => formatCurrency(v)}
                                prefix={<WalletOutlined className="text-purple-500" />}
                                valueStyle={{ color: '#722ed1', fontSize: 18, fontWeight: 700 }}
                            />
                            <Button type="link" className="p-0 text-xs text-purple-500"
                                onClick={() => navigate('/landlord/finance')}>
                                Nạp tiền <RightOutlined style={{ fontSize: 10 }} />
                            </Button>
                        </Skeleton>
                    </Card>
                </Col>

                <Col xs={12} sm={12} md={6}>
                    <Card className="shadow-sm rounded-xl border-0" style={{ borderTop: '3px solid #f96302' }}>
                        <Skeleton loading={loading} active paragraph={{ rows: 1 }}>
                            <Statistic
                                title={<span className="text-xs text-gray-500">Tin đang đẩy VIP</span>}
                                value={promotedRooms}
                                prefix={<CrownOutlined className="text-orange-500" />}
                                valueStyle={{ color: '#f96302', fontWeight: 700 }}
                            />
                            <Button type="link" className="p-0 text-xs text-orange-500"
                                onClick={() => navigate('/landlord/vip-packages')}>
                                Mua gói <RightOutlined style={{ fontSize: 10 }} />
                            </Button>
                        </Skeleton>
                    </Card>
                </Col>
            </Row>

            {/* --- HÀNG 2: TƯƠNG TÁC + LỊCH HẸN + THÔNG BÁO --- */}
            <Row gutter={[16, 16]} className="mb-6">

                {/* Tương tác tổng hợp */}
                <Col xs={24} md={8}>
                    <Card
                        title={<span className="font-bold text-sm"><BarChartOutlined className="mr-1 text-blue-500" />Tương tác tin đăng</span>}
                        className="shadow-sm rounded-xl h-full"
                        bodyStyle={{ padding: '12px 20px' }}
                    >
                        <Skeleton loading={loading} active paragraph={{ rows: 3 }}>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <EyeOutlined className="text-blue-400" />
                                        <span className="text-sm">Tổng lượt xem</span>
                                    </div>
                                    <span className="font-bold text-blue-600 text-lg">{totalViews.toLocaleString()}</span>
                                </div>
                                <Divider className="my-2" />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <HeartOutlined className="text-red-400" />
                                        <span className="text-sm">Tổng lượt thích</span>
                                    </div>
                                    <span className="font-bold text-red-500 text-lg">{totalLikes.toLocaleString()}</span>
                                </div>
                                <Divider className="my-2" />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <span className="text-blue-400 text-sm">🔖</span>
                                        <span className="text-sm">Tổng lượt lưu</span>
                                    </div>
                                    <span className="font-bold text-blue-500 text-lg">{totalSaves.toLocaleString()}</span>
                                </div>
                                <Divider className="my-2" />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <FireFilled className="text-orange-400" />
                                        <span className="text-sm">Tin đẩy VIP</span>
                                    </div>
                                    <span className="font-bold text-orange-500 text-lg">{promotedRooms}</span>
                                </div>
                                <Divider className="my-2" />
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2 text-gray-600">
                                        <DollarOutlined className="text-green-400" />
                                        <span className="text-sm">Nạp tháng này</span>
                                    </div>
                                    <span className="font-bold text-green-500 text-sm">{formatCurrency(thisMonthDeposit)}</span>
                                </div>
                            </div>
                        </Skeleton>
                    </Card>
                </Col>

                {/* Lịch hẹn sắp tới */}
                <Col xs={24} md={8}>
                    <Card
                        title={<span className="font-bold text-sm"><CalendarOutlined className="mr-1 text-orange-500" />Lịch hẹn sắp tới</span>}
                        extra={<Button type="link" size="small" onClick={() => navigate('/landlord/appointments')}>Xem tất cả</Button>}
                        className="shadow-sm rounded-xl h-full"
                        bodyStyle={{ padding: '8px 16px' }}
                    >
                        <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
                            {upcomingAppts.length === 0 ? (
                                <Empty description="Chưa có lịch hẹn sắp tới" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <List
                                    dataSource={upcomingAppts}
                                    renderItem={(appt) => (
                                        <List.Item className="px-0">
                                            <List.Item.Meta
                                                avatar={<Avatar icon={<UserOutlined />} className="bg-orange-400" />}
                                                title={<span className="text-sm font-medium">{appt.partnerName || `Khách #${appt.partnerId}`}</span>}
                                                description={
                                                    <div>
                                                        <Tag color="orange" className="text-xs">
                                                            {dayjs(appt.appointmentDate || appt.scheduledAt).format('HH:mm DD/MM')}
                                                        </Tag>
                                                        <span className="text-xs text-gray-400 ml-1">{appt.roomTitle || appt.propertyTitle}</span>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Skeleton>
                    </Card>
                </Col>

                {/* Thông báo gần đây */}
                <Col xs={24} md={8}>
                    <Card
                        title={
                            <span className="font-bold text-sm">
                                <Badge count={unreadNotif} size="small" offset={[5, 0]}>
                                    <BellOutlined className="mr-1 text-yellow-500" />
                                </Badge>
                                {' '}Thông báo
                            </span>
                        }
                        extra={<Button type="link" size="small" onClick={() => navigate('/notifications')}>Xem tất cả</Button>}
                        className="shadow-sm rounded-xl h-full"
                        bodyStyle={{ padding: '8px 16px' }}
                    >
                        <Skeleton loading={loading} active paragraph={{ rows: 4 }}>
                            {notifications.length === 0 ? (
                                <Empty description="Chưa có thông báo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <List
                                    dataSource={notifications}
                                    renderItem={(notif) => (
                                        <List.Item
                                            className={`px-0 cursor-pointer ${!notif.isRead && !notif.read ? 'font-semibold' : ''}`}
                                            onClick={() => navigate('/notifications')}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        size={32}
                                                        style={{ backgroundColor: !notif.isRead && !notif.read ? '#f96302' : '#ccc' }}
                                                        icon={<BellOutlined />}
                                                    />
                                                }
                                                title={<span className="text-xs">{notif.title}</span>}
                                                description={<span className="text-xs text-gray-400">{dayjs(notif.createdAt).fromNow()}</span>}
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Skeleton>
                    </Card>
                </Col>
            </Row>

            {/* --- HÀNG 3: TIN ĐĂNG & GIAO DỊCH GẦN ĐÂY --- */}
            <Row gutter={[16, 16]}>
                {/* Danh sách tin đăng gần đây */}
                <Col xs={24} lg={14}>
                    <Card
                        title={<span className="font-bold text-sm"><HomeOutlined className="mr-1 text-green-500" />Tin đăng của bạn</span>}
                        extra={
                            <div className="flex gap-2">
                                <Button size="small" type="primary"
                                    icon={<PlusCircleOutlined />}
                                    style={{ background: '#f96302', border: 'none' }}
                                    onClick={() => navigate('/landlord/create-room')}>
                                    Đăng tin mới
                                </Button>
                                <Button size="small" onClick={() => navigate('/landlord/room-list')}>Xem tất cả</Button>
                            </div>
                        }
                        className="shadow-sm rounded-xl"
                    >
                        <Skeleton loading={loading} active paragraph={{ rows: 5 }}>
                            {rooms.length === 0 ? (
                                <Empty
                                    description="Bạn chưa có tin đăng nào"
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                >
                                    <Button type="primary" style={{ background: '#f96302', border: 'none' }}
                                        icon={<PlusCircleOutlined />}
                                        onClick={() => navigate('/landlord/create-room')}>
                                        Đăng tin đầu tiên
                                    </Button>
                                </Empty>
                            ) : (
                                <List
                                    dataSource={rooms.slice(0, 5)}
                                    renderItem={(room) => (
                                        <List.Item
                                            className="cursor-pointer hover:bg-gray-50 transition rounded-lg px-2"
                                            onClick={() => navigate('/landlord/room-list')}
                                            actions={[
                                                <Tag color={getStatusColor(room.status)} key="status">
                                                    {getStatusLabel(room.status)}
                                                </Tag>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar
                                                        shape="square"
                                                        size={50}
                                                        src={room.thumbnail || (room.images?.[0])}
                                                        icon={<HomeOutlined />}
                                                        className="rounded-lg"
                                                    />
                                                }
                                                title={
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <span className="text-sm font-semibold">{room.title}</span>
                                                        {room.isPromoted && <Tag color="gold" className="m-0 text-[10px]">VIP</Tag>}
                                                    </div>
                                                }
                                                description={
                                                    <div className="flex gap-3 text-xs text-gray-400">
                                                        <span><DollarOutlined /> {Number(room.price || 0).toLocaleString()}đ</span>
                                                        <span><EyeOutlined /> {room.viewCount ?? room.views ?? 0}</span>
                                                        <span><HeartOutlined /> {room.likeCount ?? room.likes ?? 0}</span>
                                                        <span>🔖 {room.saveCount ?? room.saves ?? 0}</span>
                                                    </div>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Skeleton>
                    </Card>
                </Col>

                {/* Lịch sử giao dịch gần đây */}
                <Col xs={24} lg={10}>
                    <Card
                        title={<span className="font-bold text-sm"><WalletOutlined className="mr-1 text-purple-500" />Giao dịch gần đây</span>}
                        extra={<Button type="link" size="small" onClick={() => navigate('/landlord/finance')}>Xem tất cả</Button>}
                        className="shadow-sm rounded-xl h-full"
                    >
                        <Skeleton loading={loading} active paragraph={{ rows: 5 }}>
                            {/* Tóm tắt ví */}
                            <div className="bg-purple-50 rounded-lg p-3 mb-4">
                                <div className="flex justify-between items-center mb-1">
                                    <Text type="secondary" className="text-xs">Số dư ví</Text>
                                    <Text strong className="text-purple-700">{formatCurrency(balance)}</Text>
                                </div>
                                {holdBalance > 0 && (
                                    <div className="flex justify-between items-center mb-1">
                                        <Text type="secondary" className="text-xs">Đang đóng băng</Text>
                                        <Text className="text-xs text-red-400">- {formatCurrency(holdBalance)}</Text>
                                    </div>
                                )}
                                <Divider className="my-2" />
                                <div className="flex justify-between items-center">
                                    <Text strong className="text-xs">Khả dụng</Text>
                                    <Text strong className="text-green-600">{formatCurrency(availableBalance)}</Text>
                                </div>
                            </div>

                            {recentTx.length === 0 ? (
                                <Empty description="Chưa có giao dịch" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <List
                                    dataSource={recentTx}
                                    renderItem={(tx) => (
                                        <List.Item className="px-0 py-2">
                                            <List.Item.Meta
                                                avatar={
                                                    <Avatar size={32} style={{ backgroundColor: getTxColor(tx) }}>
                                                        <DollarOutlined />
                                                    </Avatar>
                                                }
                                                title={
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-xs font-medium">{getTxLabel(tx)}</span>
                                                        <span className="text-xs font-bold" style={{ color: getTxColor(tx) }}>
                                                            {isPositiveTx(tx) ? '+' : '-'}
                                                            {Math.abs(getTxAmount(tx)).toLocaleString()}đ
                                                        </span>
                                                    </div>
                                                }
                                                description={
                                                    <span className="text-xs text-gray-400">{dayjs(tx.createdAt).fromNow()}</span>
                                                }
                                            />
                                        </List.Item>
                                    )}
                                />
                            )}
                        </Skeleton>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default LandlordDashboard;
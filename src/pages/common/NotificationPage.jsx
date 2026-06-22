import React, { useEffect, useState } from 'react';
import { List, Avatar, Button, Typography, Spin, Empty, Modal, message, Tag, Tabs, Badge } from 'antd';
import {
    BellOutlined, CheckCircleOutlined, DollarOutlined,
    CalendarOutlined, CrownOutlined, ArrowRightOutlined,
    SafetyCertificateOutlined, UpCircleOutlined, AlertOutlined,
    TruckOutlined, MessageOutlined, CheckOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';
import notificationService from '../../services/notificationService';
import appointmentService from '../../services/appointmentService';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../../contexts/NotificationContext';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const { Title, Text } = Typography;

const NotificationPage = () => {
    const [notifications, setNotifications] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const navigate = useNavigate();
    const { decrementUnreadCount, markAllAsReadContext } = useNotification();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [allRes, unreadRes] = await Promise.allSettled([
                notificationService.getMyNotifications(),
                notificationService.getUnreadNotifications(0, 50)
            ]);

            if (allRes.status === 'fulfilled') {
                const raw = allRes.value.data;
                let data = [];
                if (Array.isArray(raw)) data = raw;
                else if (raw?.result && Array.isArray(raw.result)) data = raw.result;
                else if (raw?.result?.content && Array.isArray(raw.result.content)) data = raw.result.content;
                else if (raw?.data && Array.isArray(raw.data)) data = raw.data;
                else if (raw?.content && Array.isArray(raw.content)) data = raw.content;
                setNotifications(data);
            }

            if (unreadRes.status === 'fulfilled') {
                const raw = unreadRes.value.data;
                let data = [];
                if (Array.isArray(raw)) data = raw;
                else if (raw?.result && Array.isArray(raw.result)) data = raw.result;
                else if (raw?.result?.content && Array.isArray(raw.result.content)) data = raw.result.content;
                else if (raw?.content && Array.isArray(raw.content)) data = raw.content;
                setUnreadNotifications(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const checkIsRead = (item) => item.isRead || item.read || false;

    const handleQuickAccept = (e, item) => {
        e.stopPropagation();
        Modal.confirm({
            title: 'Xác nhận đổi lịch',
            content: 'Bạn có chắc chắn đồng ý với thời gian chủ trọ đề xuất không?',
            okText: 'Đồng ý ngay',
            cancelText: 'Để sau',
            onOk: async () => {
                try {
                    await appointmentService.acceptSuggestion(item.referenceId);
                    message.success("Đã chốt lịch hẹn thành công!");
                    fetchData();
                } catch (error) {
                    message.error(error.response?.data?.message || "Có lỗi xảy ra");
                }
            }
        });
    };

    const handleRead = async (item) => {
        const isRead = checkIsRead(item);
        if (!isRead) {
            try {
                await notificationService.markAsRead(item.id);
                setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isRead: true, read: true } : n));
                setUnreadNotifications(prev => prev.filter(n => n.id !== item.id));
                decrementUnreadCount();
            } catch (error) {
                console.error(error);
            }
        }

        switch (item.type) {
            case 'CHAT_NEW':
                navigate('/messages', { state: { openPartnerId: item.referenceId } });
                break;
            case 'PURCHASE_PACKAGE':
            case 'DEDUCTION':
                navigate('/landlord/finance');
                break;
            case 'ROOM_PUSH_SUCCESS':
            case 'ROOM_EXPIRING':
                navigate('/landlord/room-list');
                break;
            case 'KYC_STATUS':
                navigate('/profile');
                break;
            case 'APPOINTMENT_SUGGESTION':
                break;
            default:
                if (item.title && (item.title.includes('Lịch') || item.type === 'APPOINTMENT')) {
                    navigate('/landlord/appointments');
                }
                break;
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'CHAT_NEW': return <MessageOutlined className="text-blue-400" />;
            case 'BILL_NEW': return <DollarOutlined className="text-yellow-600" />;
            case 'CONTRACT_SIGN': return <CheckCircleOutlined className="text-green-600" />;
            case 'APPOINTMENT_SUGGESTION': return <CalendarOutlined className="text-orange-500" />;
            case 'PURCHASE_PACKAGE':
            case 'DEDUCTION': return <CrownOutlined className="text-purple-600" />;
            case 'KYC_STATUS': return <SafetyCertificateOutlined className="text-blue-500" />;
            case 'ROOM_PUSH_SUCCESS': return <UpCircleOutlined className="text-green-500" />;
            case 'ROOM_EXPIRING': return <AlertOutlined className="text-red-500" />;
            case 'SERVICE_BOOKED': return <TruckOutlined className="text-cyan-600" />;
            default: return <BellOutlined className="text-gray-400" />;
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationService.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
            setUnreadNotifications([]);
            markAllAsReadContext();
            message.success("Đã đánh dấu tất cả là đã đọc");
        } catch (error) {
            message.error("Lỗi khi đánh dấu đã đọc");
        }
    };

    const renderItem = (item) => {
        const isRead = checkIsRead(item);
        return (
            <List.Item
                key={item.id}
                className={`cursor-pointer hover:bg-gray-50 transition-colors p-4 rounded-lg mb-3 border ${!isRead ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-gray-100'}`}
                onClick={() => handleRead(item)}
                actions={[!isRead && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />]}
            >
                <List.Item.Meta
                    avatar={
                        <Avatar
                            size={44}
                            style={{ backgroundColor: isRead ? '#f5f5f5' : '#fff', border: `1px solid ${isRead ? '#eee' : '#ffd591'}` }}
                            icon={getIcon(item.type)}
                        />
                    }
                    title={
                        <div className="flex justify-between items-start">
                            <span className={`text-[15px] ${!isRead ? 'font-bold text-gray-800' : 'text-gray-600'}`}>{item.title}</span>
                            <Text type="secondary" style={{ fontSize: 11 }} className="whitespace-nowrap ml-2">{dayjs(item.createdAt).fromNow()}</Text>
                        </div>
                    }
                    description={
                        <div className="mt-1">
                            <div className="text-gray-600 text-[14px] leading-relaxed mb-2">{item.message}</div>
                            <div className="flex flex-wrap gap-2">
                                {item.type === 'CHAT_NEW' && !isRead && <Tag color="blue" icon={<MessageOutlined />}>Tin nhắn mới</Tag>}
                                {item.type === 'APPOINTMENT_SUGGESTION' && !isRead && (
                                    <Button type="primary" size="small" className="bg-orange-500 border-none text-[12px] font-bold h-7" onClick={(e) => handleQuickAccept(e, item)}>
                                        CHỐT LỊCH NGAY
                                    </Button>
                                )}
                                {item.type === 'ROOM_EXPIRING' && <Tag color="error" icon={<AlertOutlined />}>Sắp ẩn tin</Tag>}
                                {item.type === 'KYC_STATUS' && (
                                    <Tag color={item.message?.includes('thành công') ? 'success' : 'error'}>
                                        {item.message?.includes('thành công') ? 'Đã định danh' : 'Cần nộp lại'}
                                    </Tag>
                                )}
                                {item.type === 'ROOM_PUSH_SUCCESS' && <Tag color="green" icon={<CheckCircleOutlined />}>Thành công</Tag>}
                                {isRead && <Text type="secondary" className="text-[12px] italic">Xem chi tiết <ArrowRightOutlined className="text-[10px]" /></Text>}
                            </div>
                        </div>
                    }
                />
            </List.Item>
        );
    };

    const tabItems = [
        {
            key: 'all',
            label: 'Tất cả',
            children: loading
                ? <div className="text-center py-10"><Spin size="large" /></div>
                : <List itemLayout="horizontal" dataSource={notifications} locale={{ emptyText: <Empty description="Bạn chưa có thông báo nào" /> }} renderItem={renderItem} />
        },
        {
            key: 'unread',
            label: (
                <span className="flex items-center gap-1.5">
                    Chưa đọc
                    {unreadNotifications.length > 0 && <Badge count={unreadNotifications.length} size="small" />}
                </span>
            ),
            children: loading
                ? <div className="text-center py-10"><Spin size="large" /></div>
                : <List itemLayout="horizontal" dataSource={unreadNotifications} locale={{ emptyText: <Empty description="Không có thông báo chưa đọc" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }} renderItem={renderItem} />
        }
    ];

    return (
        <div className="max-w-3xl mx-auto p-6 bg-white shadow-sm rounded-lg min-h-screen my-4">
            <div className="flex justify-between items-center mb-4">
                <Title level={3} style={{ margin: 0 }}>
                    <BellOutlined className="mr-2 text-orange-500" />
                    Thông báo
                </Title>
                <div className="flex gap-2">
                    <Button icon={<CheckOutlined />} onClick={handleMarkAllAsRead} className="text-orange-600 border-orange-600 hover:bg-orange-50">
                        Đánh dấu tất cả đã đọc
                    </Button>
                    <Button type="primary" onClick={fetchData} className="bg-gray-800 border-none hover:bg-gray-700">
                        Làm mới
                    </Button>
                </div>
            </div>

            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" tabBarStyle={{ marginBottom: 16 }} />
        </div>
    );
};

export default NotificationPage;
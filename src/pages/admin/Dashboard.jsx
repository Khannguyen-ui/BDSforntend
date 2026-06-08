import React, { useEffect, useState } from 'react';
import {
    Row, Col, Card, Table, Tag, Button, Space,
    Typography, Skeleton, Statistic
} from 'antd';
import {
    UserOutlined, HomeOutlined, DollarCircleOutlined,
    FileDoneOutlined, BarChartOutlined, BellOutlined,
    ReloadOutlined, SettingOutlined, CheckCircleOutlined,
    ClockCircleOutlined, RiseOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import adminService from '../../services/adminService';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [pendingRooms, setPendingRooms] = useState(0);
    const [totalRooms, setTotalRooms] = useState(0);
    const [activeRooms, setActiveRooms] = useState(0);
    const [pendingKyc, setPendingKyc] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const [revenueData, setRevenueData] = useState([]);
    const [recentPending, setRecentPending] = useState([]);

    const getPage = (res) => {
        return (
            res?.data?.result ||
            res?.data?.data ||
            res?.data ||
            {}
        );
    };

    const getPageContent = (res) => {
        const raw =
            res?.data?.result?.content ||
            res?.data?.content ||
            res?.data?.data?.content ||
            [];

        return Array.isArray(raw) ? raw : [];
    };

    const getTotalElements = (res) => {
        const page = getPage(res);

        return Number(
            page?.totalElements ??
            page?.numberOfElements ??
            page?.content?.length ??
            0
        );
    };

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const results = await Promise.allSettled([
                // 1. Phòng chờ duyệt
                adminService.getAllPropertiesStat('PENDING'),
                // 2. Tổng phòng
                adminService.getDashboardStats(),
                // 3. Phòng đã duyệt (ACTIVE)
                adminService.getAllPropertiesStat('ACTIVE'),
                // 4. KYC chờ duyệt
                adminService.getPendingKycUsers(),
                // 5. Danh sách phòng PENDING gần đây
                adminService.getPendingRooms(),
                // 6. Tổng users (cần backend /admin/users hoạt động)
                adminService.getAllUsers(),
                // 7. Giao dịch theo tháng (cần backend /api/transactions hoạt động)
                adminService.getMonthlyTransactions(),
            ]);

            // 1. Pending rooms count
            if (results[0].status === 'fulfilled') {
                setPendingRooms(getTotalElements(results[0].value));
            }

            // 2. Total rooms
            if (results[1].status === 'fulfilled') {
                setTotalRooms(getTotalElements(results[1].value));
            }

            // 3. Active rooms
            if (results[2].status === 'fulfilled') {
                setActiveRooms(getTotalElements(results[2].value));
            }

            // 4. Pending KYC
            if (results[3].status === 'fulfilled') {
                const d = results[3].value.data;
                const list =
                    Array.isArray(d?.result) ? d.result :
                        Array.isArray(d?.content) ? d.content :
                            Array.isArray(d) ? d :
                                [];

                setPendingKyc(list.length);
            }

            // 5. Recent pending rooms
            if (results[4].status === 'fulfilled') {
                const list = getPageContent(results[4].value);
                setRecentPending(list.slice(0, 5));
            }

            // 6. Total users
            if (results[5].status === 'fulfilled') {
                const d = results[5].value.data;
                const list =
                    Array.isArray(d?.result) ? d.result :
                        Array.isArray(d?.content) ? d.content :
                            Array.isArray(d) ? d :
                                [];

                setTotalUsers(
                    Number(
                        d?.result?.totalElements ??
                        d?.totalElements ??
                        list.length ??
                        0
                    )
                );
            }

            // 7. Revenue từ transactions trong tháng hiện tại
            if (results[6].status === 'fulfilled') {
                const d = results[6].value.data;

                const transactions =
                    Array.isArray(d?.result) ? d.result :
                        Array.isArray(d?.content) ? d.content :
                            Array.isArray(d) ? d :
                                [];

                const successTransactions = transactions.filter(t => t.status === 'SUCCESS');

                const currentMonth = dayjs().format('YYYY-MM');

                const monthlyTotal = successTransactions
                    .filter(t => dayjs(t.createdAt).format('YYYY-MM') === currentMonth)
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

                setMonthlyRevenue(monthlyTotal);

                const grouped = successTransactions.reduce((acc, t) => {
                    const month = dayjs(t.createdAt).format('MM/YYYY');
                    acc[month] = (acc[month] || 0) + Number(t.amount || 0);
                    return acc;
                }, {});

                setRevenueData(
                    Object.entries(grouped).map(([month, revenue]) => ({
                        month,
                        revenue
                    }))
                );
            } else {
                console.error("Lỗi lấy transactions:", results[6].reason);
                import('antd').then(({ message }) => {
                    message.error("Không lấy được dữ liệu doanh thu: " + (results[6].reason?.message || "Lỗi API"));
                });
            }


        } catch (error) {
            console.error('Dashboard error:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

    // ─── Biểu đồ doanh thu ───────────────────────────────────────────────────
    const revenueConfig = {
        data: revenueData,
        xField: 'month',
        yField: 'revenue',
        point: { size: 5, shape: 'diamond' },
        smooth: true,
        color: '#f96302',
        yAxis: {
            label: {
                formatter: (v) => {
                    return Number(v).toLocaleString('vi-VN');
                }
            }
        },
        tooltip: {
            formatter: (d) => ({
                name: 'Doanh thu',
                value: Number(d.revenue).toLocaleString('vi-VN')
            })
        },
    };

    // ─── Biểu đồ phân bố phòng ───────────────────────────────────────────────
    const pieData = [
        { type: 'Da duyet', value: activeRooms },
        { type: 'Cho duyet', value: pendingRooms },
        { type: 'Khac', value: Math.max(0, totalRooms - activeRooms - pendingRooms) },
    ].filter(d => d.value > 0);

    const roomPieConfig = {
        data: pieData,
        angleField: 'value',
        colorField: 'type',
        radius: 0.8,
        color: ['#52c41a', '#faad14', '#d9d9d9'],
        label: pieData.length > 0 ? {
            text: (d) => (d && d.type) ? `${d.type}: ${d.value}` : '',
        } : false,
        legend: { position: 'bottom' },
    };

    // ─── Cột bảng tin gần đây ────────────────────────────────────────────────
    const pendingColumns = [
        {
            title: 'Tiêu đề',
            dataIndex: 'title',
            ellipsis: true,
            render: (t) => <Text strong>{t || '—'}</Text>
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            align: 'right',
            render: (v) => <Text type="warning">{Number(v || 0).toLocaleString()}đ</Text>
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            align: 'center',
            render: () => <Tag color="orange" icon={<ClockCircleOutlined />}>Chờ duyệt</Tag>
        },
        {
            title: '',
            align: 'center',
            render: (_, r) => (
                <Link to="/admin/approve-rooms">
                    <Button size="small" type="primary" style={{ background: '#f96302', borderColor: '#f96302' }}>
                        Duyệt
                    </Button>
                </Link>
            )
        }
    ];

    if (loading) {
        return <div className="p-8"><Skeleton active paragraph={{ rows: 10 }} /></div>;
    }

    // Hàm định dạng số tiền lớn để tránh tràn giao diện
    const formatCurrency = (value) => {
        if (value >= 1000000000) {
            return (value / 1000000000).toFixed(1).replace(/\.0$/, '') + ' Tỷ';
        }
        if (value >= 1000000) {
            return (value / 1000000).toFixed(1).replace(/\.0$/, '') + ' Tr';
        }
        return new Intl.NumberFormat('vi-VN').format(value);
    };

    // ─── Stat cards ──────────────────────────────────────────────────────────
    const statCards = [
        {
            title: 'Phòng chờ duyệt',
            value: pendingRooms,
            icon: <HomeOutlined />,
            color: '#f96302',
            bg: '#fff7f0',
            tag: pendingRooms > 0 ? 'Cần xử lý' : null,
            link: '/admin/approve-rooms',
        },
        {
            title: 'KYC chờ duyệt',
            value: pendingKyc,
            icon: <UserOutlined />,
            color: '#faad14',
            bg: '#fffbe6',
            tag: pendingKyc > 0 ? 'Ưu tiên' : null,
            link: '/admin/users',
        },
        {
            title: 'Doanh thu tháng',
            value: monthlyRevenue,
            icon: <DollarCircleOutlined />,
            color: '#1890ff',
            bg: '#e6f7ff',
            suffix: 'đ',
            formatter: formatCurrency,
            link: null,
        },
        {
            title: 'Tổng người dùng',
            value: totalUsers,
            icon: <FileDoneOutlined />,
            color: '#722ed1',
            bg: '#f9f0ff',
            link: '/admin/users',
        },
    ];

    return (
        <div style={{ padding: 24, background: '#f0f4ff', minHeight: '100vh' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                    <div>
                        <Title level={2} style={{ color: '#1f2937', margin: 0 }}>
                            🏠 Bảng Điều Khiển Admin
                        </Title>
                        <Text type="secondary">Dữ liệu thực từ hệ thống • Cập nhật lúc {dayjs().format('HH:mm DD/MM/YYYY')}</Text>
                    </div>
                    <Button icon={<ReloadOutlined />} onClick={fetchDashboardData} loading={loading}>
                        Làm mới
                    </Button>
                </div>

                {/* Stat Cards */}
                <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                    {statCards.map((card, i) => (
                        <Col xs={24} sm={12} lg={6} key={i}>
                            <Link to={card.link || '#'} style={{ display: 'block' }}>
                                <Card
                                    hoverable={!!card.link}
                                    style={{ borderTop: `4px solid ${card.color}`, background: card.bg }}
                                    styles={{ body: { padding: '20px 24px' } }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ fontSize: 32, color: card.color, marginBottom: 4 }}>{card.icon}</div>
                                            <Statistic
                                                value={card.value}
                                                suffix={card.suffix}
                                                formatter={card.formatter}
                                                styles={{ content: { fontSize: 24, fontWeight: 900, color: '#1f2937', whiteSpace: 'nowrap' } }}
                                            />
                                            <div style={{ color: '#6b7280', fontWeight: 600, marginTop: 4 }}>{card.title}</div>
                                        </div>
                                        {card.tag && (
                                            <Tag color="red" style={{ fontWeight: 600 }}>{card.tag}</Tag>
                                        )}
                                    </div>
                                </Card>
                            </Link>
                        </Col>
                    ))}
                </Row>

                {/* Charts */}
                <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
                    <Col xs={24} lg={16}>
                        <Card
                            title={
                                <Space>
                                    <RiseOutlined style={{ color: '#f96302' }} />
                                    <span style={{ fontWeight: 700 }}>Doanh thu theo tháng</span>
                                </Space>
                            }
                            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                        >
                            {revenueData.length > 0
                                ? <Line {...revenueConfig} height={280} />
                                : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chưa có dữ liệu giao dịch</div>
                            }
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card
                            title={
                                <Space>
                                    <BarChartOutlined style={{ color: '#722ed1' }} />
                                    <span style={{ fontWeight: 700 }}>Phân bố tin đăng</span>
                                </Space>
                            }
                            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                        >
                            {totalRooms > 0
                                ? <Pie {...roomPieConfig} height={280} />
                                : <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>Chưa có tin đăng nào</div>
                            }
                        </Card>
                    </Col>
                </Row>

                {/* Tin đăng chờ duyệt gần đây */}
                <Row gutter={[24, 24]}>
                    <Col span={24}>
                        <Card
                            title={
                                <Space>
                                    <BellOutlined style={{ color: '#faad14' }} />
                                    <span style={{ fontWeight: 700 }}>Tin đăng mới chờ duyệt</span>
                                    {pendingRooms > 0 && <Tag color="red">{pendingRooms} tin</Tag>}
                                </Space>
                            }
                            extra={
                                <Link to="/admin/approve-rooms">
                                    <Button type="primary" icon={<CheckCircleOutlined />} style={{ background: '#f96302', borderColor: '#f96302' }}>
                                        Xem tất cả
                                    </Button>
                                </Link>
                            }
                            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
                        >
                            <Table
                                dataSource={recentPending}
                                columns={pendingColumns}
                                rowKey="id"
                                pagination={false}
                                size="middle"
                                locale={{ emptyText: '✅ Không có tin nào chờ duyệt' }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Quick Links */}
                <Card style={{ marginTop: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
                    <Title level={5} style={{ marginBottom: 16 }}>Truy cập nhanh</Title>
                    <Space wrap size="large">
                        <Link to="/admin/approve-rooms">
                            <Button type="primary" icon={<HomeOutlined />} style={{ background: '#f96302', borderColor: '#f96302' }}>
                                Duyệt tin ({pendingRooms})
                            </Button>
                        </Link>
                        <Link to="/admin/users">
                            <Button icon={<UserOutlined />}>
                                Users & KYC ({pendingKyc} KYC chờ)
                            </Button>
                        </Link>
                        <Link to="/admin/master-data">
                            <Button icon={<SettingOutlined />}>Master Data</Button>
                        </Link>
                        <Link to="/admin/service-packages">
                            <Button icon={<DollarCircleOutlined />}>Gói Dịch Vụ</Button>
                        </Link>
                    </Space>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
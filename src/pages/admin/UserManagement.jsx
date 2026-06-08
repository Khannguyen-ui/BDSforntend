import React, { useEffect, useState } from 'react';
import {
  Table, Card, Input, Tag, Button, Avatar, Typography, Tooltip,
  message, Popconfirm, Space, Modal, Tabs, Image, Row, Col,
  Drawer, Statistic, Empty, Descriptions, Alert, Select
} from 'antd';
import {
  SearchOutlined, UserOutlined, LockOutlined, UnlockOutlined,
  DeleteOutlined, EyeOutlined, CheckCircleOutlined, ReloadOutlined,
  CrownOutlined, FileTextOutlined, DollarOutlined
} from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';

import adminService from '../../services/adminService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pendingKycList, setPendingKycList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [selectedKycUser, setSelectedKycUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingKyc, setProcessingKyc] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userProperties, setUserProperties] = useState([]);
  const [userTransactions, setUserTransactions] = useState([]);
  const [userSubscription, setUserSubscription] = useState(null);

  const [propertyStatusFilter, setPropertyStatusFilter] = useState('ALL');
  const [propertyProjectFilter, setPropertyProjectFilter] = useState('ALL');

  const [searchParams] = useSearchParams();
  const [openedUserIdFromUrl, setOpenedUserIdFromUrl] = useState(null);

  // --- LOAD DỮ LIỆU ---
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Lấy danh sách KYC chờ duyệt
      const kycRes = await adminService.getPendingKycUsers().catch(() => ({ data: { result: [] } }));
      const kycData = kycRes.data?.result || kycRes.data || [];
      setPendingKycList(Array.isArray(kycData) ? kycData : []);

      // Lấy danh sách tất cả người dùng (API mới đã được implement)
      const usersRes = await adminService.getAllUsers().catch(() => ({ data: { result: [] } }));
      const usersData = usersRes.data?.result || usersRes.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu người dùng/KYC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);
  const normalizePageData = (res) => {
    const raw =
      res?.data?.result?.content ||
      res?.data?.content ||
      res?.data?.result ||
      res?.data ||
      [];

    return Array.isArray(raw) ? raw : [];
  };

  const normalizeArrayData = (res) => {
    const raw =
      res?.data?.result ||
      res?.data?.content ||
      res?.data ||
      [];

    return Array.isArray(raw) ? raw : [];
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(Number(value || 0));
  };

  const isActiveDate = (date) => {
    if (!date) return false;
    return dayjs(date).isAfter(dayjs());
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'green';
      case 'PENDING':
        return 'orange';
      case 'REJECTED':
        return 'red';
      case 'DELETED':
        return 'default';
      case 'RENTED':
        return 'purple';
      default:
        return 'blue';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'red';
      case 'OWNER':
        return 'green';
      case 'USER':
        return 'blue';
      default:
        return 'default';
    }
  };

  const getKycColor = (status) => {
    switch (status) {
      case 'VERIFIED':
        return 'green';
      case 'PENDING':
        return 'orange';
      case 'REJECTED':
        return 'red';
      default:
        return 'default';
    }
  };

  const formatDateTime = (value) => {
    return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '--';
  };

  const safeText = (value, fallback = '--') => {
    return value !== null && value !== undefined && value !== '' ? value : fallback;
  };

  const getPropertyMainImage = (record) => {
    if (Array.isArray(record.images) && record.images.length > 0) {
      return record.images[0];
    }

    if (record.imageUrl) return record.imageUrl;
    if (record.thumbnail) return record.thumbnail;

    return null;
  };

  const handleDisableUser = async (id) => {
    try {
      await adminService.deleteUser(id);
      message.success("Đã vô hiệu hóa tài khoản");
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || "Vô hiệu hóa thất bại");
    }
  };
  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setDetailOpen(true);
    setDetailLoading(true);
    setUserProperties([]);
    setUserTransactions([]);
    setUserSubscription(null);

    try {
      const [propertiesRes, transactionsRes, subscriptionRes] = await Promise.allSettled([
        adminService.getUserProperties(user.id),
        adminService.getUserTransactions(user.id),
        adminService.getUserSubscriptions(user.id)
      ]);

      if (propertiesRes.status === 'fulfilled') {
        setUserProperties(normalizePageData(propertiesRes.value));
      }

      if (transactionsRes.status === 'fulfilled') {
        setUserTransactions(normalizeArrayData(transactionsRes.value));
      }

      if (subscriptionRes.status === 'fulfilled') {
        const data = subscriptionRes.value?.data?.result || subscriptionRes.value?.data;
        setUserSubscription(data || null);
      }
    } catch (error) {
      console.error(error);
      message.error('Không thể tải chi tiết người dùng');
    } finally {
      setDetailLoading(false);
    }
  };
  useEffect(() => {
    const userIdFromUrl = searchParams.get('userId');

    if (!userIdFromUrl || users.length === 0) return;
    if (openedUserIdFromUrl === userIdFromUrl) return;

    const foundUser = users.find(user => Number(user.id) === Number(userIdFromUrl));

    if (foundUser) {
      setOpenedUserIdFromUrl(userIdFromUrl);
      openUserDetail(foundUser);
    }
  }, [searchParams, users, openedUserIdFromUrl]);

  const handleToggleStatus = async (user) => {
    try {
      await adminService.toggleUserStatus(user.id);
      message.success(user.active ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      fetchUsers();
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi cập nhật trạng thái");
    }
  };

  const handlePromote = async (user) => {
    try {
      await adminService.promoteToAdmin(user.id);
      message.success("Đã cấp quyền Quản trị viên thành công!");
      fetchUsers();
    } catch (error) {
      message.error("Lỗi cấp quyền Admin");
    }
  };

  // --- LOGIC DUYỆT KYC ---
  const handleOpenKycModal = (user) => {
    setSelectedKycUser(user);
    setRejectReason("");
    setIsKycModalOpen(true);
  };

  const handleProcessKyc = async (approved) => {
    if (!approved && !rejectReason.trim()) {
      return message.warning("Vui lòng nhập lý do từ chối!");
    }

    setProcessingKyc(true);
    try {
      if (approved) {
        // ✅ Gọi approveKyc
        await adminService.approveKyc(selectedKycUser.id);
        message.success("✅ Đã duyệt KYC thành công!");
      } else {
        // ✅ Gọi rejectKyc với reason
        await adminService.rejectKyc(selectedKycUser.id, rejectReason);
        message.success("❌ Đã từ chối KYC!");
      }

      setIsKycModalOpen(false);
      setRejectReason("");
      fetchUsers();
    } catch (error) {
      console.error("KYC Error:", error.response?.data);
      message.error(" Lỗi: " + (error.response?.data?.message || "Thử lại"));
    } finally {
      setProcessingKyc(false);
    }
  };
  const userSummary = (() => {
    const activeProperties = userProperties.filter(p => p.status === 'ACTIVE');
    const pendingProperties = userProperties.filter(p => p.status === 'PENDING');
    const rejectedProperties = userProperties.filter(p => p.status === 'REJECTED');

    const promotedProperties = userProperties.filter(p =>
      p.isPromoted && isActiveDate(p.promotionExpiresAt)
    );

    const successTransactions = userTransactions.filter(t => t.status === 'SUCCESS');

    const totalSpent = successTransactions
      .filter(t => ['PURCHASE_PACKAGE', 'ROOM_PROMOTION', 'PUSH_ROOM', 'MEMBERSHIP', 'POST_FEE', 'DEDUCTION'].includes(t.type))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    return {
      totalProperties: userProperties.length,
      activeProperties: activeProperties.length,
      pendingProperties: pendingProperties.length,
      rejectedProperties: rejectedProperties.length,
      promotedProperties: promotedProperties.length,
      totalTransactions: successTransactions.length,
      totalSpent
    };
  })();


  const renderKycContent = () => {
    if (!selectedKycUser) return null;

    // Xử lý mảng ảnh vì backend FastAPI có thể trả về string JSON hoặc mảng trực tiếp
    const rawImgs = selectedKycUser.citizenImages || selectedKycUser.citizen_images;
    let imgs = [];
    if (Array.isArray(rawImgs)) {
      imgs = rawImgs;
    } else if (typeof rawImgs === 'string') {
      try {
        imgs = JSON.parse(rawImgs);
      } catch (e) {
        imgs = [rawImgs];
      }
    }

    return (
      <div>
        <div className="bg-gray-50 p-3 rounded mb-4 border">
          <p><strong>Họ tên:</strong> {selectedKycUser.fullName}</p>
          <p><strong>Số CCCD:</strong> <span className="text-blue-600 font-bold">{selectedKycUser.citizenId}</span></p>
          <p><strong>Email:</strong> {selectedKycUser.email}</p>
        </div>

        <p className="font-semibold mb-2">Hình ảnh giấy tờ:</p>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div className="text-center text-xs text-gray-500 mb-1">Mặt trước</div>
            <Image
              src={imgs[0]}
              fallback="https://via.placeholder.com/300x200?text=No+Image"
              className="rounded border object-cover h-40 w-full"
            />
          </Col>
          <Col span={12}>
            <div className="text-center text-xs text-gray-500 mb-1">Mặt sau</div>
            <Image
              src={imgs[1]}
              fallback="https://via.placeholder.com/300x200?text=No+Image"
              className="rounded border object-cover h-40 w-full"
            />
          </Col>
        </Row>

        <div className="mt-4 pt-4 border-t">
          <p className="text-sm mb-1 text-gray-600">Lý do từ chối (Nếu chọn Từ chối):</p>
          <TextArea
            rows={2}
            placeholder="Nhập lý do..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </div>
    );
  };

  // --- CẤU HÌNH CỘT ---
  const userColumns = [

    {
      title: 'Thành viên',
      dataIndex: 'fullName',
      render: (text, record) => (
        <div className="flex items-center gap-3">
          <Avatar icon={<UserOutlined />} src={record.avatarUrl} />
          <div>
            <Text strong>{text}</Text>
            <div className="text-xs text-gray-400">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      render: (role) => <Tag color={role === 'ADMIN' ? 'red' : (role === 'OWNER' ? 'green' : 'blue')}>{role}</Tag>
    },
    {
      title: 'Định danh (KYC)',
      dataIndex: 'kycStatus',
      render: (status) => {
        let color = status === 'VERIFIED' ? 'success' : (status === 'PENDING' ? 'warning' : 'default');
        return <Tag icon={status === 'VERIFIED' ? <CheckCircleOutlined /> : null} color={color}>{status || 'UNVERIFIED'}</Tag>
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      render: (active) => <Tag color={active ? 'success' : 'error'}>{active ? 'Hoạt động' : 'Đã khóa'}</Tag>
    },
    {
      title: 'Hành động',
      align: 'right',
      render: (_, record) => (
        <Space wrap>
          <Tooltip title="Xem chi tiết">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => openUserDetail(record)}
            >
              Chi tiết
            </Button>
          </Tooltip>
          {record.role !== 'ADMIN' && (
            <Popconfirm
              title={record.active ? "Khóa tài khoản này?" : "Mở khóa tài khoản này?"}
              onConfirm={() => handleToggleStatus(record)}
              okText="Xác nhận"
              cancelText="Hủy"
            >
              <Button
                size="small"
                danger={record.active}
                icon={record.active ? <LockOutlined /> : <UnlockOutlined />}
              >
                {record.active ? 'Khóa' : 'Mở khóa'}
              </Button>
            </Popconfirm>
          )}

          {record.role !== 'ADMIN' && (
            <Popconfirm
              title="Cấp quyền Admin?"
              description="Thao tác này có rủi ro bảo mật. Chỉ thực hiện nếu chắc chắn."
              onConfirm={() => handlePromote(record)}
              okText="Cấp quyền"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<UserOutlined />} className="text-blue-500 border-blue-500 hover:bg-blue-50">
                Cấp Admin
              </Button>
            </Popconfirm>
          )}

          {record.role !== 'ADMIN' && record.active && (
            <Popconfirm
              title="Vô hiệu hóa tài khoản?"
              description="Tài khoản sẽ bị khóa, dữ liệu lịch sử vẫn được giữ lại."
              onConfirm={() => handleDisableUser(record.id)}
              okText="Vô hiệu hóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                Vô hiệu hóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    }
  ];

  const kycColumns = [
    { title: 'ID', dataIndex: 'id', width: 60 },
    {
      title: 'Người yêu cầu',
      render: (_, r) => <div><b>{r.fullName}</b><br /><span className="text-xs text-gray-500">{r.email}</span></div>
    },
    { title: 'Số CCCD', dataIndex: 'citizenId', render: t => <Tag color="blue">{t}</Tag> },
    { title: 'Thời gian', dataIndex: 'createdAt', render: d => dayjs(d).format('DD/MM HH:mm') },
    {
      title: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <Button type="primary" icon={<EyeOutlined />} onClick={() => handleOpenKycModal(record)}>
          Xem & Duyệt
        </Button>
      )
    }
  ];

  const filteredUsers = users.filter(user => {
    const keyword = searchText.toLowerCase().trim();

    if (!keyword) return true;

    return (
      String(user.fullName || '').toLowerCase().includes(keyword) ||
      String(user.email || '').toLowerCase().includes(keyword) ||
      String(user.id || '').includes(keyword)
    );
  });
  const propertyProjects = Array.from(
    new Map(
      userProperties
        .filter(item => item.projectId && item.projectNameSnapshot)
        .map(item => [
          item.projectId,
          {
            id: item.projectId,
            name: item.projectNameSnapshot
          }
        ])
    ).values()
  );

  const propertyStatusOptions = Array.from(
    new Set(userProperties.map(item => item.status).filter(Boolean))
  );

  const filteredUserProperties = userProperties.filter(item => {
    const matchStatus =
      propertyStatusFilter === 'ALL' || item.status === propertyStatusFilter;

    const matchProject =
      propertyProjectFilter === 'ALL' ||
      Number(item.projectId) === Number(propertyProjectFilter);

    return matchStatus && matchProject;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={3} style={{ margin: 0 }}>Quản Trị Hệ Thống</Title>
            <Text type="secondary">Quản lý người dùng và duyệt hồ sơ định danh</Text>
          </div>
          <Space>
            <Input
              placeholder="Tìm kiếm..."
              prefix={<SearchOutlined />}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 250 }}
            />
            <Button icon={<ReloadOutlined />} onClick={fetchUsers}>Làm mới</Button>

          </Space>
        </div>

        <Card bordered={false} className="shadow-lg rounded-lg">
          <Tabs defaultActiveKey="1" items={[
            {
              key: '1',
              label: 'Danh sách tất cả người dùng',
              children: (
                <Table
                  dataSource={filteredUsers}
                  columns={userColumns}
                  rowKey="id"
                  loading={loading}
                  pagination={{ pageSize: 8 }}
                />
              )
            },
            {
              key: '2',
              label: (
                <span>
                  Yêu cầu duyệt KYC
                  {pendingKycList.length > 0 && <Tag color="red" className="ml-2">{pendingKycList.length}</Tag>}
                </span>
              ),
              children: (
                <Table
                  dataSource={pendingKycList}
                  columns={kycColumns}
                  rowKey="id"
                  loading={loading}
                  locale={{ emptyText: 'Hiện không có yêu cầu nào cần duyệt' }}
                />
              )
            }
          ]} />
        </Card>
        <Drawer
          title={`Chi tiết người dùng${selectedUser?.fullName ? ` - ${selectedUser.fullName}` : ''}`}
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          width={1000}
          destroyOnHidden
        >
          {!selectedUser ? (
            <Empty description="Không có dữ liệu người dùng" />
          ) : (
            <Tabs
              defaultActiveKey="overview"
              items={[
                {
                  key: 'overview',
                  label: 'Tổng quan',
                  children: (
                    <div className="space-y-4">
                      <Descriptions bordered size="small" column={2}>
                        <Descriptions.Item label="ID">{selectedUser.id}</Descriptions.Item>
                        <Descriptions.Item label="Họ tên">{selectedUser.fullName || 'Chưa cập nhật'}</Descriptions.Item>
                        <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
                        <Descriptions.Item label="Vai trò">
                          <Tag color={getRoleColor(selectedUser.role)}>
                            {selectedUser.role}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="KYC">
                          <Tag color={getKycColor(selectedUser.kycStatus)}>
                            {selectedUser.kycStatus || 'UNVERIFIED'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Trạng thái">
                          <Tag color={selectedUser.active ? 'green' : 'red'}>
                            {selectedUser.active ? 'Đang hoạt động' : 'Đã khóa'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Lượt đăng còn lại">
                          {selectedUser.freePostsRemaining ?? 0}
                        </Descriptions.Item>
                        <Descriptions.Item label="Ngày tạo">
                          {selectedUser.createdAt ? dayjs(selectedUser.createdAt).format('DD/MM/YYYY HH:mm') : '--'}
                        </Descriptions.Item>
                      </Descriptions>

                      <Row gutter={[16, 16]}>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Tổng tin" value={userSummary.totalProperties} prefix={<FileTextOutlined />} />
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Đang hoạt động" value={userSummary.activeProperties} />
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Chờ duyệt" value={userSummary.pendingProperties} />
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Đang đẩy tin" value={userSummary.promotedProperties} prefix={<CrownOutlined />} />
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Giao dịch thành công" value={userSummary.totalTransactions} prefix={<DollarOutlined />} />
                          </Card>
                        </Col>
                        <Col xs={12} md={6}>
                          <Card>
                            <Statistic title="Tổng đã chi" value={userSummary.totalSpent} formatter={(v) => formatMoney(v)} />
                          </Card>
                        </Col>
                      </Row>
                    </div>
                  )
                },
                {
                  key: 'properties',
                  label: `Tin đăng (${userProperties.length})`,
                  children: (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-3 items-center">
                        <Select
                          value={propertyStatusFilter}
                          onChange={setPropertyStatusFilter}
                          style={{ width: 180 }}
                          options={[
                            { value: 'ALL', label: 'Tất cả trạng thái' },
                            ...propertyStatusOptions.map(status => ({
                              value: status,
                              label: status
                            }))
                          ]}
                        />

                        <Select
                          value={propertyProjectFilter}
                          onChange={setPropertyProjectFilter}
                          style={{ width: 220 }}
                          options={[
                            { value: 'ALL', label: 'Tất cả dự án' },
                            ...propertyProjects.map(project => ({
                              value: project.id,
                              label: project.name
                            }))
                          ]}
                        />

                        {(propertyStatusFilter !== 'ALL' || propertyProjectFilter !== 'ALL') && (
                          <Button
                            onClick={() => {
                              setPropertyStatusFilter('ALL');
                              setPropertyProjectFilter('ALL');
                            }}
                          >
                            Bỏ lọc
                          </Button>
                        )}
                      </div>

                      <Table
                        loading={detailLoading}
                        rowKey="id"
                        dataSource={filteredUserProperties}
                        pagination={{ pageSize: 5 }}
                        locale={{ emptyText: 'Người dùng này chưa có tin đăng phù hợp' }}
                        columns={[
                          {
                            title: 'Tin đăng',
                            width: 320,
                            render: (_, record) => {
                              const img = getPropertyMainImage(record);

                              return (
                                <div className="flex gap-3">
                                  {img ? (
                                    <Image
                                      src={img}
                                      width={72}
                                      height={54}
                                      className="object-cover rounded border"
                                      fallback="https://via.placeholder.com/120x90?text=No+Image"
                                    />
                                  ) : (
                                    <div className="w-[72px] h-[54px] rounded border bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                                      No Image
                                    </div>
                                  )}

                                  <div>
                                    <div className="font-semibold line-clamp-1">
                                      {safeText(record.title, 'Không có tiêu đề')}
                                    </div>

                                    <Text type="secondary" className="text-xs line-clamp-2">
                                      {safeText(record.address, 'Chưa có địa chỉ')}
                                    </Text>

                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {record.transactionType && <Tag>{record.transactionType}</Tag>}
                                      {record.propertyType && <Tag color="blue">{record.propertyType}</Tag>}
                                      {record.videoUrl && <Tag color="purple">Có video</Tag>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                          },
                          {
                            title: 'Trạng thái',
                            dataIndex: 'status',
                            width: 130,
                            render: status => (
                              <Tag color={getStatusColor(status)}>
                                {safeText(status)}
                              </Tag>
                            )
                          },
                          {
                            title: 'Giá / Diện tích',
                            width: 160,
                            render: (_, record) => (
                              <div>
                                <div className="font-semibold text-red-600">
                                  {record.price ? formatMoney(record.price) : 'Thỏa thuận'}
                                </div>
                                <Text type="secondary" className="text-xs">
                                  {record.area ? `${record.area} m²` : '--'}
                                </Text>
                              </div>
                            )
                          },
                          {
                            title: 'Dự án',
                            width: 180,
                            render: (_, record) => (
                              record.projectId ? (
                                <Tag color="geekblue">
                                  {record.projectNameSnapshot || `Dự án #${record.projectId}`}
                                </Tag>
                              ) : (
                                <span className="text-gray-400">Không thuộc dự án</span>
                              )
                            )
                          },
                          {
                            title: 'Gói đẩy',
                            width: 180,
                            render: (_, record) => {
                              if (!record.isPromoted) return <Tag>Không</Tag>;

                              const active = isActiveDate(record.promotionExpiresAt);

                              return (
                                <div>
                                  <Tag color={active ? 'orange' : 'default'}>
                                    {record.promotionPackageName || 'Đang đẩy'}
                                  </Tag>
                                  <div className="text-xs text-gray-500">
                                    Hết hạn: {formatDateTime(record.promotionExpiresAt)}
                                  </div>
                                </div>
                              );
                            }
                          },
                          {
                            title: 'Thời hạn',
                            width: 170,
                            render: (_, record) => (
                              <div>
                                <div className="text-xs">
                                  Tạo: {formatDateTime(record.createdAt)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Hết hạn: {formatDateTime(record.expiresAt)}
                                </div>
                              </div>
                            )
                          },
                          {
                            title: 'Xem',
                            width: 90,
                            render: (_, record) => (
                              <Space>
                                {record.status === 'ACTIVE' && (
                                  <a href={`/rooms/${record.id}`} target="_blank" rel="noopener noreferrer">
                                    <Button size="small" icon={<EyeOutlined />}>
                                      Public
                                    </Button>
                                  </a>
                                )}

                                <Button
                                  size="small"
                                  onClick={() => navigate(`/admin/rooms?propertyId=${record.id}`)}
                                >
                                  Quản trị
                                </Button>
                              </Space>
                            )
                          }
                        ]}
                      />
                    </div>
                  )
                },
                {
                  key: 'subscriptions',
                  label: 'Gói cước & giao dịch',
                  children: (
                    <div className="space-y-4">
                      {userSubscription?.membership ? (
                        <Card title="Gói hội viên hiện tại">
                          <Descriptions bordered size="small" column={2}>
                            <Descriptions.Item label="Tên gói">
                              {userSubscription.membership.packageName || '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Loại gói">
                              {userSubscription.membership.packageType || '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Số tiền">
                              {formatMoney(userSubscription.membership.amount)}
                            </Descriptions.Item>
                            <Descriptions.Item label="Ngày mua">
                              {userSubscription.membership.purchasedAt
                                ? dayjs(userSubscription.membership.purchasedAt).format('DD/MM/YYYY HH:mm')
                                : userSubscription.membership.startedAt
                                  ? dayjs(userSubscription.membership.startedAt).format('DD/MM/YYYY HH:mm')
                                  : '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Hết hạn">
                              {userSubscription.membership.expiresAt
                                ? dayjs(userSubscription.membership.expiresAt).format('DD/MM/YYYY HH:mm')
                                : userSubscription.membership.estimatedExpiresAt
                                  ? dayjs(userSubscription.membership.estimatedExpiresAt).format('DD/MM/YYYY HH:mm')
                                  : '--'}
                            </Descriptions.Item>
                            <Descriptions.Item label="Trạng thái">
                              <Tag color={userSubscription.membership.active ? 'green' : 'red'}>
                                {userSubscription.membership.active ? 'Còn hiệu lực' : 'Hết hạn'}
                              </Tag>
                            </Descriptions.Item>
                          </Descriptions>

                          {userSubscription.membership.sourceNote && (
                            <Alert
                              className="mt-3"
                              type="warning"
                              showIcon
                              message={userSubscription.membership.sourceNote}
                            />
                          )}
                        </Card>
                      ) : (
                        <Alert type="info" showIcon message="Người dùng chưa có gói hội viên đang hiệu lực." />
                      )}

                      <Card title="Giao dịch gần đây">
                        <Table
                          rowKey="id"
                          dataSource={userSubscription?.recentTransactions || userTransactions}
                          pagination={{ pageSize: 5 }}
                          columns={[
                            {
                              title: 'Loại',
                              dataIndex: 'type',
                              render: type => <Tag>{type}</Tag>
                            },
                            {
                              title: 'Số tiền',
                              dataIndex: 'amount',
                              render: amount => formatMoney(amount)
                            },
                            {
                              title: 'Trạng thái',
                              dataIndex: 'status',
                              render: status => <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>{status}</Tag>
                            },
                            {
                              title: 'Mô tả',
                              dataIndex: 'description'
                            },
                            {
                              title: 'Thời gian',
                              dataIndex: 'createdAt',
                              render: value => value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '--'
                            }
                          ]}
                        />
                      </Card>
                    </div>
                  )
                },
                {
                  key: 'kyc',
                  label: 'KYC',
                  children: (
                    <Descriptions bordered size="small" column={1}>
                      <Descriptions.Item label="Họ tên">
                        {selectedUser.fullName || '--'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Email">
                        {selectedUser.email || '--'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Số CCCD">
                        {selectedUser.citizenId || 'Chưa có dữ liệu'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Trạng thái KYC">
                        <Tag color={selectedUser.kycStatus === 'VERIFIED' ? 'green' : selectedUser.kycStatus === 'PENDING' ? 'orange' : 'default'}>
                          {selectedUser.kycStatus || 'UNVERIFIED'}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>
                  )
                }
              ]}
            />
          )}
        </Drawer>

        <Modal
          title="Duyệt Hồ Sơ Định Danh"
          open={isKycModalOpen}
          onCancel={() => setIsKycModalOpen(false)}
          width={700}
          footer={[
            <Button key="cancel" onClick={() => setIsKycModalOpen(false)}>Thoát</Button>,
            <Button
              key="reject"
              danger
              loading={processingKyc}
              onClick={() => handleProcessKyc(false)}
            >
              Từ chối
            </Button>,
            <Button
              key="approve"
              type="primary"
              className="bg-green-600 hover:bg-green-500"
              loading={processingKyc}
              onClick={() => handleProcessKyc(true)}
            >
              Duyệt Hồ Sơ
            </Button>
          ]}
        >
          {renderKycContent()}
        </Modal>

      </div>
    </div>
  );
};

export default UserManagement;
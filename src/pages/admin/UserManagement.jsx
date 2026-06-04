import React, { useEffect, useState } from 'react';
import {
  Table, Card, Input, Tag, Button, Avatar, Typography, Tooltip,
  message, Popconfirm, Space, Modal, Form, Select, Tabs, Image, Row, Col
} from 'antd';
import {
  SearchOutlined, UserOutlined, LockOutlined, UnlockOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined, EyeOutlined,
  CheckCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';

// --- 1. SỬA IMPORT: Dùng adminService ---
import adminService from '../../services/adminService';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pendingKycList, setPendingKycList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // State CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form] = Form.useForm();

  // State KYC
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [selectedKycUser, setSelectedKycUser] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processingKyc, setProcessingKyc] = useState(false);

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

  // --- CRUD USER ---
  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    if (user) {
      form.setFieldsValue({ ...user, password: '' });
    } else {
      form.resetFields();
    }
    setIsModalOpen(true);
  };

  const handleSaveUser = async (values) => {
    try {
      if (editingUser) {
        if (!values.password) delete values.password;
        // Gọi adminService.updateUser
        await adminService.updateUser(editingUser.id, values);
        message.success("Cập nhật thành công!");
      } else {
        // Gọi adminService.createUser
        await adminService.createUser(values);
        message.success("Thêm người dùng thành công!");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      message.error(editingUser ? "Cập nhật thất bại" : "Thêm mới thất bại");
    }
  };

  const handleDelete = async (id) => {
    try {
      // Gọi adminService.deleteUser
      await adminService.deleteUser(id);
      message.success("Đã xóa tài khoản");
      fetchUsers();
    } catch (error) {
      message.error("Xóa thất bại");
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      // Gọi adminService.toggleUserStatus
      await adminService.toggleUserStatus(user.id);
      message.success("Cập nhật trạng thái thành công");
      fetchUsers();
    } catch (error) {
      message.error("Lỗi cập nhật trạng thái");
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
      message.error("❌ Lỗi: " + (error.response?.data?.message || "Thử lại"));
    } finally {
      setProcessingKyc(false);
    }
  };

  // --- Render Nội dung Modal KYC ---
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
        <Space>
          <Tooltip title="Sửa"><Button icon={<EditOutlined />} size="small" onClick={() => handleOpenModal(record)} /></Tooltip>
          {record.role !== 'ADMIN' && (
            <Popconfirm title="Cấp quyền Admin?" onConfirm={() => handlePromote(record)}>
              <Tooltip title="Cấp quyền Admin">
                <Button size="small" icon={<UserOutlined />} className="text-blue-500 border-blue-500 hover:bg-blue-50" />
              </Tooltip>
            </Popconfirm>
          )}
          {record.role !== 'ADMIN' && (
            <Popconfirm title="Đổi trạng thái?" onConfirm={() => handleToggleStatus(record)}>
              <Button size="small" danger={record.active} icon={record.active ? <LockOutlined /> : <UnlockOutlined />} />
            </Popconfirm>
          )}
          {record.role !== 'ADMIN' && (
            <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => handleDelete(record.id)}>
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
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

  const filteredUsers = users.filter(user =>
    user.fullName?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchText.toLowerCase())
  );

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
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpenModal(null)}>Thêm User</Button>
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

        {/* MODAL USER CRUD */}
        <Modal
          title={editingUser ? "Cập Nhật User" : "Thêm User Mới"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={() => form.submit()}
          okText="Lưu"
        >
          <Form form={form} layout="vertical" onFinish={handleSaveUser}>
            <Form.Item name="fullName" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input disabled={!!editingUser} /></Form.Item>
            <Form.Item name="phone" label="SĐT"><Input /></Form.Item>
            <Form.Item name="role" label="Vai trò" initialValue="USER">
              <Select>
                <Option value="USER">Người dùng</Option>
                <Option value="OWNER">Mô giới</Option>
                <Option value="ADMIN">Admin</Option>
              </Select>
            </Form.Item>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: !editingUser }]}><Input.Password placeholder={editingUser ? "Nhập nếu muốn đổi" : ""} /></Form.Item>
          </Form>
        </Modal>

        {/* MODAL DUYỆT KYC */}
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
import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber,
  Popconfirm, Space, Tag, Card, Switch,
  Row, Col, Tooltip, Select, Divider, Typography, Badge, App
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  GiftOutlined, DollarOutlined, ClockCircleOutlined,
  CheckCircleOutlined, StopOutlined, ReloadOutlined,
  StarFilled, ThunderboltFilled, CrownFilled
} from '@ant-design/icons';
import adminService from '../../services/adminService';

const { TextArea } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

// ─── Meta theo loại gói ────────────────────────────────────────────────────
const TYPE_META = {
  ROOM_PROMOTION: { label: 'Đẩy Tin', color: '#f96302', icon: <ThunderboltFilled />, tagColor: 'orange' },
  MEMBERSHIP: { label: 'Hội Viên', color: '#d48806', icon: <CrownFilled />, tagColor: 'gold' },
};

const ServicePackages = () => {
  const { message: msg } = App.useApp();
  // ─── State ─────────────────────────────────────────────────────────────────
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterType, setFilterType] = useState('ALL');

  const [form] = Form.useForm();
  const selectedType = Form.useWatch('type', form);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllServicePackages();
      setPackages(res.data || []);
    } catch (err) {
      msg.error('Không tải được danh sách gói: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPackages(); }, []);

  // ─── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    form.resetFields();
    form.setFieldsValue({ active: true, discountPercent: 0, priorityLevel: 1 });
    setIsModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({ ...record });
    setIsModalOpen(true);
  };
  const normalizePackagePayload = (values) => {
    const payload = {
      ...values,
      price: Number(values.price || 0),
      discountPercent: Number(values.discountPercent || 0),
      active: values.active ?? true
    };

    if (payload.type === 'MEMBERSHIP') {
      payload.quotaLimit = Number(values.quotaLimit || 0);
      payload.priorityLevel = 0;
      payload.durationDays = 0;
    }

    if (payload.type === 'ROOM_PROMOTION') {
      payload.durationDays = Number(values.durationDays || 0);
      payload.priorityLevel = Number(values.priorityLevel || 0);
      payload.quotaLimit = 0;
    }

    return payload;
  };
  // ─── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (values) => {
    setSubmitting(true);
    try {
      const payload = normalizePackagePayload(values);

      if (editingId) {
        await adminService.updateServicePackage(editingId, payload);
        msg.success('Cập nhật gói thành công!');
      } else {
        await adminService.createServicePackage(payload);
        msg.success('Tạo gói mới thành công!');
      }

      setIsModalOpen(false);
      fetchPackages();
    } catch (err) {
      msg.error('Lỗi: ' + (err.response?.data?.message || 'Hệ thống bận, thử lại sau'));
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await adminService.deleteServicePackage(id);
      msg.success('Đã xóa gói thành công!');
      fetchPackages();
    } catch (err) {
      msg.error('Không thể xóa: ' + (err.response?.data?.message || 'Gói đang được sử dụng'));
    }
  };

  // ─── Columns ───────────────────────────────────────────────────────────────
  const columns = [
    {
      title: 'Tên Gói',
      dataIndex: 'name',
      width: '20%',
      render: (text, record) => {
        const meta = TYPE_META[record.type] || {};
        return (
          <Space>
            <span style={{ color: meta.color, fontSize: 18 }}>{meta.icon}</span>
            <span style={{ fontWeight: 700 }}>{text}</span>
          </Space>
        );
      }
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      align: 'center',
      filters: [
        { text: 'Đẩy Tin', value: 'ROOM_PROMOTION' },
        { text: 'Hội Viên', value: 'MEMBERSHIP' },
      ],
      onFilter: (val, rec) => rec.type === val,
      render: (type) => {
        const meta = TYPE_META[type] || { label: type, tagColor: 'default' };
        return <Tag color={meta.tagColor}>{meta.label}</Tag>;
      }
    },
    {
      title: 'Giá',
      dataIndex: 'price',
      align: 'right',
      sorter: (a, b) => a.price - b.price,
      render: (v) => (
        <Text strong style={{ color: '#f96302' }}>
          {Number(v || 0).toLocaleString('vi-VN')} ₫
        </Text>
      )
    },
    {
      title: 'Thời hạn',
      dataIndex: 'durationDays',
      align: 'center',
      render: (v) => (
        <Space>
          <ClockCircleOutlined style={{ color: '#1890ff' }} />
          <span>{v} ngày</span>
        </Space>
      )
    },
    {
      title: 'Giảm giá',
      dataIndex: 'discountPercent',
      align: 'center',
      render: (v) =>
        v > 0 ? <Tag color="green">-{v}%</Tag> : <Text type="secondary">—</Text>
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priorityLevel',
      align: 'center',
      sorter: (a, b) => (a.priorityLevel || 0) - (b.priorityLevel || 0),
      render: (v) =>
        v > 0
          ? <Tag color={v >= 10 ? '#f50' : 'orange'}>P{v}</Tag>
          : <Text type="secondary">—</Text>
    },
    {
      title: 'Lượt đăng',
      dataIndex: 'quotaLimit',
      align: 'center',
      render: (v) => <Tag color="blue">{v || 0} tin</Tag>
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      align: 'center',
      filters: [
        { text: 'Đang bán', value: true },
        { text: 'Đã tắt', value: false },
      ],
      onFilter: (val, rec) => rec.active === val,
      render: (active) =>
        active
          ? <Badge status="success" text="Đang bán" />
          : <Badge status="default" text="Đã tắt" />
    },
    {
      title: 'Hành động',
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              icon={<EditOutlined />}
              style={{ color: '#f96302' }}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa gói này?"
            description="Hành động không thể hoàn tác. Chắc chắn chưa?"
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record.id)}
          >
            <Tooltip title="Xóa">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // ─── Filtered data ─────────────────────────────────────────────────────────
  const displayData =
    filterType === 'ALL' ? packages : packages.filter(p => p.type === filterType);

  // ─── Summary stats ─────────────────────────────────────────────────────────
  const stats = [
    { label: 'Tổng gói', value: packages.length, color: '#1890ff' },
    { label: 'Gói Đẩy Tin', value: packages.filter(p => p.type === 'ROOM_PROMOTION').length, color: '#f96302' },
    { label: 'Gói Hội Viên', value: packages.filter(p => p.type === 'MEMBERSHIP').length, color: '#d48806' },
    { label: 'Đang bán', value: packages.filter(p => p.active).length, color: '#52c41a' },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f4ff' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: '#1f2937' }}>
            <GiftOutlined style={{ color: '#f96302', marginRight: 8 }} />
            Quản Lý Gói Dịch Vụ
          </Title>
          {/*<Text type="secondary">
            CRUD đầy đủ — endpoint: <code>/api/admin/packages</code>
          </Text>*/}
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchPackages} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreate}
            style={{ background: '#f96302', borderColor: '#f96302' }}
          >
            Thêm Gói Mới
          </Button>
        </Space>
      </div>

      {/* Stat Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          <Col xs={12} sm={6} key={i}>
            <Card
              style={{ borderTop: `3px solid ${s.color}`, textAlign: 'center' }}
              styles={{ body: { padding: '16px 12px' } }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{s.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Table Card */}
      <Card
        title={
          <Space>
            <span style={{ fontWeight: 700 }}>Danh sách Gói</span>
            <Select
              value={filterType}
              onChange={setFilterType}
              size="small"
              style={{ width: 150 }}
            >
              <Option value="ALL">Tất cả loại</Option>
              <Option value="ROOM_PROMOTION">Đẩy Tin</Option>
              <Option value="MEMBERSHIP">Hội Viên</Option>
            </Select>
          </Space>
        }
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
      >
        <Table
          dataSource={displayData}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'Chưa có gói dịch vụ nào. Nhấn "Thêm Gói Mới" để bắt đầu!' }}
        />
      </Card>

      {/* Modal Form */}
      <Modal
        title={
          <Space>
            <GiftOutlined style={{ color: '#f96302' }} />
            <span style={{ color: '#f96302', fontWeight: 700 }}>
              {editingId ? 'Chỉnh Sửa Gói Dịch Vụ' : 'Tạo Gói Dịch Vụ Mới'}
            </span>
          </Space>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingId ? 'Lưu thay đổi' : 'Tạo gói'}
        cancelText="Hủy"
        confirmLoading={submitting}
        width={620}
        centered
        okButtonProps={{ style: { background: '#f96302', borderColor: '#f96302' } }}
      >
        <Divider />
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          requiredMark="optional"
        >
          {/* Tên */}
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 600 }}>Tên Gói</span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên gói!' }]}
          >
            <Input
              placeholder="VD: Gói VIP Kim Cương"
              size="large"
              prefix={<GiftOutlined />}
            />
          </Form.Item>

          <Row gutter={16}>
            {/* Loại */}
            <Col span={12}>
              <Form.Item
                name="type"
                label="Loại gói"
                rules={[{ required: true, message: 'Vui lòng chọn loại gói' }]}
              >
                <Select
                  placeholder="Chọn loại gói"
                  onChange={(value) => {
                    if (value === 'MEMBERSHIP') {
                      form.setFieldsValue({
                        priorityLevel: 0,
                        durationDays: 0
                      });
                    }

                    if (value === 'ROOM_PROMOTION') {
                      form.setFieldsValue({
                        quotaLimit: 0
                      });
                    }
                  }}
                >
                  <Option value="MEMBERSHIP">Gói lượt đăng tin</Option>
                  <Option value="ROOM_PROMOTION">Gói đẩy tin / VIP</Option>
                </Select>
              </Form.Item>
            </Col>

            {/* Trạng thái */}
            <Col span={12}>
              <Form.Item
                name="active"
                label={<span style={{ fontWeight: 600 }}>Trạng thái</span>}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Đang bán"
                  unCheckedChildren="Đã tắt"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            {/* Giá */}
            <Col span={12}>
              <Form.Item
                name="price"
                label={<span style={{ fontWeight: 600 }}>Giá (VNĐ)</span>}
                rules={[
                  { required: true, message: 'Vui lòng nhập giá!' },
                  {
                    validator: (_, value) => {
                      if (Number(value) > 0) return Promise.resolve();
                      return Promise.reject(new Error('Giá gói phải lớn hơn 0'));
                    }
                  }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  size="large"
                  min={1}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => v.replace(/,/g, '')}
                  addonAfter="₫"
                />
              </Form.Item>
            </Col>

            {/* Thời hạn */}
            <Col span={12}>
              {selectedType === 'ROOM_PROMOTION' && (
                <>
                  <Form.Item
                    name="durationDays"
                    label="Thời hạn đẩy tin"
                    rules={[
                      { required: true, message: 'Vui lòng nhập thời hạn' },
                      {
                        validator: (_, value) => {
                          if (value > 0) return Promise.resolve();
                          return Promise.reject(new Error('Thời hạn phải lớn hơn 0 ngày'));
                        }
                      }
                    ]}
                  >
                    <InputNumber min={1} addonAfter="ngày" className="w-full" />
                  </Form.Item>

                  <Form.Item
                    name="priorityLevel"
                    label="Cấp ưu tiên"
                    rules={[
                      { required: true, message: 'Vui lòng nhập cấp ưu tiên' },
                      {
                        validator: (_, value) => {
                          if (value > 0) return Promise.resolve();
                          return Promise.reject(new Error('Cấp ưu tiên phải lớn hơn 0'));
                        }
                      }
                    ]}
                  >
                    <InputNumber min={1} className="w-full" />
                  </Form.Item>
                </>
              )}
            </Col>
          </Row>

          <Row gutter={16}>
            {/* Giảm giá */}
            <Col span={8}>
              <Form.Item
                name="discountPercent"
                label={<span style={{ fontWeight: 600 }}>% Giảm giá</span>}
                initialValue={0}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  size="large"
                  min={0}
                  max={100}
                  formatter={v => `${v}%`}
                  parser={v => v.replace('%', '')}
                />
              </Form.Item>
            </Col>


            {/* Quota Limit */}
            <Col span={8}>
              {selectedType === 'MEMBERSHIP' && (
                <Form.Item
                  name="quotaLimit"
                  label="Số lượt đăng tin"
                  rules={[
                    { required: true, message: 'Vui lòng nhập số lượt đăng' },
                    {
                      validator: (_, value) => {
                        if (value > 0) return Promise.resolve();
                        return Promise.reject(new Error('Số lượt đăng phải lớn hơn 0'));
                      }
                    }
                  ]}
                >
                  <InputNumber min={1} className="w-full" />
                </Form.Item>
              )}
            </Col>
          </Row>

          {/* Mô tả */}
          <Form.Item
            name="description"
            label={<span style={{ fontWeight: 600 }}>Mô tả quyền lợi</span>}
          >
            <TextArea
              rows={3}
              placeholder="Mô tả ngắn gọn quyền lợi để người dùng dễ hiểu..."
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ServicePackages;

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Tag, Space, Tabs, Popconfirm, message, Modal,
  Form, Input, InputNumber, Select, Tooltip
} from 'antd';
import {
  DeleteOutlined, UndoOutlined, StopOutlined,
  PlusOutlined, EditOutlined
} from '@ant-design/icons';
import adminService from '../../services/adminService';
import LocationPicker from '../../components/shared/LocationPicker';
import { EnvironmentOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;

const ProjectManagement = () => {
  const [activeProjects, setActiveProjects] = useState([]);
  const [trashProjects, setTrashProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form] = Form.useForm();

  const handleProjectLocationChange = (lat, lng, addressData) => {
    form.setFieldsValue({
      latitude: lat,
      longitude: lng
    });

    if (addressData?.fullAddress) {
      form.setFieldsValue({
        address: addressData.fullAddress
      });
    }
  };

  // --- FETCH DATA ---
  const fetchActiveProjects = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAllProjects(0, 100);
      const data = res.data?.content || res.data?.result || res.data?.data || [];
      setActiveProjects(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi tải danh sách dự án');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrashProjects = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTrashProjects(0, 100);
      const data = res.data?.content || res.data?.result || res.data?.data || [];
      setTrashProjects(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi tải dữ liệu thùng rác dự án');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === '1') {
      fetchActiveProjects();
    } else {
      fetchTrashProjects();
    }
  }, [activeTab]);

  // --- ACTIONS ---
  const handleSoftDelete = async (id) => {
    try {
      await adminService.softDeleteProject(id);
      message.success('Đã đưa dự án vào thùng rác!');
      fetchActiveProjects();
    } catch (error) {
      message.error('Không thể xóa dự án: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRestore = async (id) => {
    try {
      await adminService.restoreProject(id);
      message.success('Khôi phục dự án thành công!');
      fetchTrashProjects();
    } catch (error) {
      message.error('Lỗi khôi phục: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleHardDelete = async (id) => {
    try {
      await adminService.hardDeleteProject(id);
      message.success('Đã xóa vĩnh viễn dự án!');
      fetchTrashProjects();
    } catch (error) {
      message.error('Lỗi xóa vĩnh viễn: ' + (error.response?.data?.message || error.message));
    }
  };

  // --- MODAL (THÊM / SỬA) ---
  const openCreateModal = () => {
    setEditingId(null);
    form.resetFields();
    // Default values
    form.setFieldsValue({ projectType: 'CHUNG_CU' });
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      address: record.address,
      latitude: record.latitude,
      longitude: record.longitude,
      projectType: record.projectType,
      amenities: record.amenities || [],
    });
    setIsModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingId) {
        await adminService.updateProject(editingId, values);
        message.success('Cập nhật dự án thành công!');
      } else {
        await adminService.createProject(values);
        message.success('Tạo dự án thành công!');
      }
      setIsModalOpen(false);
      fetchActiveProjects();
    } catch (error) {
      message.error('Lỗi lưu dự án: ' + (error.response?.data?.message || error.message));
    }
  };

  // --- CỘT CHO TAB "ĐANG HOẠT ĐỘNG" ---
  const activeColumns = [
    { title: 'Tên dự án', dataIndex: 'name', width: 250, render: (t) => <span className="font-bold">{t}</span> },
    { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
    {
      title: 'Loại hình',
      dataIndex: 'projectType',
      render: (type) => <Tag color="blue">{type}</Tag>
    },
    { title: 'Trạng thái', dataIndex: 'status', render: (status) => <Tag color="green">{status || 'ACTIVE'}</Tag> },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openEditModal(record)} size="small" type="primary" ghost>
            Sửa
          </Button>
          <Popconfirm
            title="Xóa dự án này?"
            description="Dự án sẽ được đưa vào Thùng rác."
            onConfirm={() => handleSoftDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa mềm">
              <Button danger icon={<StopOutlined />} size="small">Xóa</Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- CỘT CHO TAB "THÙNG RÁC" ---
  const trashColumns = [
    { title: 'Tên dự án (Đã xóa)', dataIndex: 'name', width: 250, render: (t) => <span className="text-gray-400 line-through">{t}</span> },
    { title: 'Địa chỉ', dataIndex: 'address', ellipsis: true },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '' },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Khôi phục dự án này?"
            onConfirm={() => handleRestore(record.id)}
            okText="Khôi phục"
            cancelText="Hủy"
          >
            <Button type="primary" className="bg-green-600" icon={<UndoOutlined />} size="small">Khôi phục</Button>
          </Popconfirm>

          <Popconfirm
            title="Xóa VĨNH VIỄN?"
            description="Thao tác này không thể hoàn tác!"
            onConfirm={() => handleHardDelete(record.id)}
            okText="Xóa luôn"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button danger icon={<DeleteOutlined />} size="small">Xóa vĩnh viễn</Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="p-4 bg-white rounded shadow min-h-screen">
      <div className="mb-4 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản Lý Dự Án</h2>
          <p className="text-gray-500">Tạo, sửa, xóa và quản lý thùng rác cho Dự án/Khu trọ.</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreateModal} className="bg-[#f96302] hover:bg-[#e05a02] border-none h-10 font-bold">
          Thêm Dự Án Mới
        </Button>
      </div>

      <Tabs defaultActiveKey="1" onChange={(key) => setActiveTab(key)} type="card">
        <TabPane tab={<span className="font-medium">Dự Án Đang Hoạt Động</span>} key="1">
          <Table
            dataSource={activeProjects}
            columns={activeColumns}
            rowKey="id"
            loading={loading && activeTab === '1'}
          />
        </TabPane>
        <TabPane tab={<span className="font-medium text-red-500"><DeleteOutlined /> Thùng Rác</span>} key="2">
          <Table
            dataSource={trashProjects}
            columns={trashColumns}
            rowKey="id"
            loading={loading && activeTab === '2'}
          />
        </TabPane>
      </Tabs>

      {/* --- MODAL THÊM / SỬA --- */}
      <Modal
        title={<span className="text-xl font-bold">{editingId ? 'Sửa Dự Án' : 'Thêm Dự Án Mới'}</span>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
        okText="Lưu lại"
        cancelText="Hủy"
        okButtonProps={{ className: "bg-[#f96302] hover:bg-[#e05a02] border-none" }}
      >
        <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
          <Form.Item name="name" label="Tên dự án" rules={[{ required: true, message: 'Vui lòng nhập tên dự án!' }]}>
            <Input placeholder="Nhập tên dự án..." size="large" />
          </Form.Item>

          <div className="flex gap-4">
            <Form.Item name="projectType" label="Loại hình" className="flex-1" rules={[{ required: true }]}>
              <Select size="large">
                <Option value="CHUNG_CU">Chung cư</Option>
                <Option value="KHU_TRO">Khu trọ / Dãy trọ</Option>
                <Option value="BIET_THU">Biệt thự</Option>
                <Option value="KHAC">Khác</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="address"
            label="Địa chỉ dự án / khu trọ"
            rules={[{ required: true, message: 'Vui lòng chọn hoặc nhập địa chỉ!' }]}
          >
            <Input
              prefix={<EnvironmentOutlined className="text-red-500" />}
              placeholder="Địa chỉ sẽ tự điền khi chọn vị trí trên bản đồ"
              size="large"
            />
          </Form.Item>

          <div className="mb-4">
            <div className="font-semibold text-gray-700 mb-2">
              Chọn vị trí dự án trên bản đồ
            </div>

            <LocationPicker
              onCoordinatesChange={handleProjectLocationChange}
              initialLat={form.getFieldValue('latitude') || 10.7769}
              initialLng={form.getFieldValue('longitude') || 106.7009}
            />
          </div>

          <Form.Item
            name="latitude"
            hidden
            rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ!' }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item
            name="longitude"
            hidden
            rules={[{ required: true, message: 'Vui lòng chọn vị trí trên bản đồ!' }]}
          >
            <InputNumber />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <TextArea rows={4} placeholder="Nhập mô tả chi tiết về dự án..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectManagement;

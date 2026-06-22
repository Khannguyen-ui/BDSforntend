import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input,
  message, Popconfirm, Space, Card, ConfigProvider
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, EditOutlined,
  AppstoreFilled
} from '@ant-design/icons';
import axiosClient from '../../config/axiosClient';

// --- CẤU HÌNH THEME MÀU CAM ---
const themeConfig = {
  token: {
    colorPrimary: '#f96302', // Màu cam chủ đạo
    borderRadius: 8,
  },
  components: {
    Button: {
      colorPrimary: '#f96302',
      algorithm: true,
    }
  }
};

const MasterData = () => {
  // --- STATE ---
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form] = Form.useForm();

  // --- API CALLS ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const ameRes = await axiosClient.get('/amenities');
      setAmenities(ameRes.data);
    } catch (error) {
      console.error(error);
      message.error("Lỗi tải dữ liệu tiện ích");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- MODAL HANDLERS ---
  const openCreateModal = () => {
    setEditingId(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  const openEditModal = (record) => {
    setEditingId(record.id);
    form.setFieldsValue(record);
    setIsModalOpen(true);
  };

  const handleSave = async (values) => {
    try {
      if (editingId) {
        await axiosClient.put(`/admin/amenities/${editingId}`, values);
        message.success("Cập nhật tiện ích thành công");
      } else {
        await axiosClient.post('/admin/amenities', values);
        message.success("Thêm tiện ích thành công");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || "Hệ thống bận"));
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/amenities/${id}`);
      message.success("Đã xóa!");
      fetchData();
    } catch (error) {
      message.error("Không thể xóa (Dữ liệu đang được sử dụng)");
    }
  };

  // --- COLUMNS CONFIG ---
  const amenityColumns = [
    { title: 'Tên Tiện Ích', dataIndex: 'name', render: t => <span className="font-medium">{t}</span> },
    { title: 'Icon (URL)', dataIndex: 'icon', render: t => <span>{t || 'N/A'}</span> },
    {
      title: 'Hành động',
      render: (_, r) => (
        <Space>
          <Button type="text" icon={<EditOutlined className="text-[#f96302]" />} onClick={() => openEditModal(r)} />
          <Popconfirm title="Xóa tiện ích này?" onConfirm={() => handleDelete(r.id)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={themeConfig}>
      <div className="p-6 bg-[#fff7f0] min-h-screen">
        {/* Card chính màu trắng nổi bật trên nền cam nhạt */}
        <Card className="shadow-sm border-t-4 border-t-[#f96302]">

          <div className="mb-6 border-b border-gray-100 pb-4">
            <h2 className="text-2xl font-bold text-gray-800 m-0">
              Quản Lý Tiện Ích
            </h2>
            <p className="text-gray-500 mt-1">Cấu hình danh sách tiện ích hệ thống</p>
          </div>

          <div className="mt-4 animate-fadeIn">
            <div className="flex justify-between items-center mb-4 bg-orange-50 p-4 rounded-lg border border-orange-100">
              <div className="flex items-start gap-2 text-gray-600 text-sm max-w-2xl">
                <span>
                  Danh sách này sẽ được hiển thị khi người dùng (Chủ trọ) đăng tin mới.
                </span>
              </div>
              <Button 
                type="primary" 
                size="large" 
                icon={<PlusOutlined />} 
                onClick={openCreateModal}
                className="bg-[#f96302] text-white font-semibold hover:bg-orange-600"
                style={{ backgroundColor: '#f96302', borderColor: '#f96302' }}
              >
                Thêm Tiện Ích
              </Button>
            </div>
            <Table dataSource={amenities} columns={amenityColumns} rowKey="id" loading={loading} pagination={{ pageSize: 8 }} />
          </div>
        </Card>

        {/* --- MODAL FORM --- */}
        <Modal
          title={
            <div className="text-[#f96302] font-bold text-lg">
              <AppstoreFilled /> {editingId ? "Sửa Tiện Ích" : "Thêm Tiện Ích"}
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={() => form.submit()}
          width={500}
          centered
          okText={editingId ? "Cập nhật" : "Thêm mới"}
          cancelText="Hủy"
          okButtonProps={{
            style: { backgroundColor: '#f96302', borderColor: '#f96302', color: 'white' },
            className: "bg-[#f96302] hover:bg-orange-600 font-semibold"
          }}
        >
          <Form form={form} layout="vertical" onFinish={handleSave} className="mt-4">
            <Form.Item name="name" label="Tên hiển thị" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
              <Input placeholder="Ví dụ: Điều hòa, Wifi, Ban công" size="large" />
            </Form.Item>

            <Form.Item name="icon" label="Icon URL (Tùy chọn)">
              <Input placeholder="Ví dụ: https://cdn-icons-png.flaticon.com/512/.../icon.png" size="large" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default MasterData;
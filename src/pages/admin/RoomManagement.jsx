import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Space, Tabs, Popconfirm, message, Image, Tooltip, Select } from 'antd';
import { DeleteOutlined, UndoOutlined, StopOutlined, EyeOutlined, BankOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import adminService from '../../services/adminService';
import { getImageUrl } from '../../utils/imageHelper';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

const RoomManagement = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeRooms, setActiveRooms] = useState([]);
  const [trashRooms, setTrashRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('1');
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(undefined);
  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl) {
      setSelectedProjectId(Number(projectIdFromUrl));
    }
  }, [searchParams]);

  // Fetch dữ liệu tin đang hoạt động
  const fetchActiveRooms = async () => {
    setLoading(true);
    try {
      // Lấy danh sách phòng, có thể bỏ status để lấy tất cả hoặc lấy những tin KHÔNG TRONG THÙNG RÁC
      const res = await adminService.getAllProperties(0, 100);
      const data = res.data?.content || res.data?.result || res.data?.data || [];
      setActiveRooms(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi tải danh sách phòng');
    } finally {
      setLoading(false);
    }
  };
  const fetchProjects = async () => {
    try {
      const res = await adminService.getAllProjects(0, 100);
      const raw =
        res.data?.content ||
        res.data?.result?.content ||
        res.data?.result ||
        res.data ||
        [];

      setProjects(Array.isArray(raw) ? raw : []);
    } catch (error) {
      console.error('Lỗi tải dự án:', error);
      setProjects([]);
    }
  };

  // Fetch dữ liệu thùng rác
  const fetchTrashRooms = async () => {
    setLoading(true);
    try {
      const res = await adminService.getTrashProperties(0, 100);
      const data = res.data?.content || res.data?.result || res.data?.data || [];
      setTrashRooms(data);
    } catch (error) {
      console.error(error);
      message.error('Lỗi tải dữ liệu thùng rác');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (activeTab === '1') {
      fetchActiveRooms();
    } else {
      fetchTrashRooms();
    }
  }, [activeTab]);

  // Hành động: Xóa mềm
  const handleSoftDelete = async (id) => {
    try {
      await adminService.softDeleteProperty(id);
      message.success('Đã gỡ bài vi phạm thành công!');
      fetchActiveRooms();
    } catch (error) {
      message.error('Không thể gỡ bài: ' + (error.response?.data?.message || error.message));
    }
  };

  // Hành động: Khôi phục
  const handleRestore = async (id) => {
    try {
      await adminService.restoreProperty(id);
      message.success('Khôi phục bài đăng thành công!');
      fetchTrashRooms();
    } catch (error) {
      message.error('Lỗi khôi phục: ' + (error.response?.data?.message || error.message));
    }
  };

  // Hành động: Xóa vĩnh viễn
  const handleHardDelete = async (id) => {
    try {
      await adminService.hardDeleteProperty(id);
      message.success('Đã xóa vĩnh viễn bài đăng!');
      fetchTrashRooms();
    } catch (error) {
      message.error('Lỗi xóa vĩnh viễn: ' + (error.response?.data?.message || error.message));
    }
  };

  const filteredActiveRooms = selectedProjectId
    ? activeRooms.filter(room => Number(room.projectId) === Number(selectedProjectId))
    : activeRooms;

  const filteredTrashRooms = selectedProjectId
    ? trashRooms.filter(room => Number(room.projectId) === Number(selectedProjectId))
    : trashRooms;
  const activeColumns = [
    {
      title: 'Ảnh',
      key: 'images',
      render: (_, record) => {
        const src = getImageUrl(record);
        if (!src || src.includes('via.placeholder.com')) {
          return <div className="w-[80px] h-[60px] bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500">No Image</div>;
        }
        return <Image src={src} width={80} height={60} className="object-cover rounded" />;
      }
    },
    { title: 'Tiêu đề', dataIndex: 'title', width: 250 },
    {
      title: 'Dự án / Khu trọ',
      dataIndex: 'projectNameSnapshot',
      width: 220,
      render: (_, record) => record.projectNameSnapshot ? (
        <Tag
          color="blue"
          icon={<BankOutlined />}
          className="cursor-pointer"
          onClick={() => navigate(`/projects/${record.projectId}`)}
        >
          {record.projectNameSnapshot}
        </Tag>
      ) : (
        <span className="text-gray-400">Không thuộc dự án</span>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'ACTIVE') color = 'green';
        if (status === 'PENDING') color = 'orange';
        if (status === 'REJECTED') color = 'red';
        if (status === 'RENTED') color = 'purple';
        return <Tag color={color}>{status}</Tag>;
      }
    },
    { title: 'Chủ trọ (ID)', dataIndex: 'ownerId', render: (id) => `ID: ${id}` },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space>
          <a href={`/rooms/${record.id}`} target="_blank" rel="noopener noreferrer">
            <Button icon={<EyeOutlined />} size="small">Xem</Button>
          </a>
          <Popconfirm
            title="Gỡ bài đăng này?"
            description="Bài sẽ bị đưa vào Thùng rác."
            onConfirm={() => handleSoftDelete(record.id)}
            okText="Gỡ"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Gỡ bài vi phạm (Xóa mềm)">
              <Button danger icon={<StopOutlined />} size="small">Gỡ bài</Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  // --- CỘT CHO TAB "THÙNG RÁC" ---
  const trashColumns = [
    {
      title: 'Ảnh',
      key: 'images',
      render: (_, record) => {
        const src = getImageUrl(record);
        if (!src || src.includes('via.placeholder.com')) {
          return <div className="w-[80px] h-[60px] bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500">No Image</div>;
        }
        return <Image src={src} width={80} height={60} className="object-cover rounded" opacity={0.5} />;
      }
    },
    { title: 'Tiêu đề (Đã xóa)', dataIndex: 'title', width: 250, render: (t) => <span className="text-gray-400 line-through">{t}</span> },
    {
      title: 'Dự án / Khu trọ',
      dataIndex: 'projectNameSnapshot',
      width: 220,
      render: (_, record) => record.projectNameSnapshot ? (
        <Tag color="blue" icon={<BankOutlined />}>
          {record.projectNameSnapshot}
        </Tag>
      ) : (
        <span className="text-gray-400">Không thuộc dự án</span>
      )
    },
    { title: 'Chủ trọ (ID)', dataIndex: 'ownerId', render: (id) => `ID: ${id}` },
    { title: 'Ngày tạo', dataIndex: 'createdAt', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '' },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Khôi phục bài đăng này?"
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
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Quản Lý Tin Đăng</h2>
        <p className="text-gray-500">Xem toàn bộ tin, gỡ bài vi phạm và quản lý thùng rác.</p>
      </div>
      <div className="mb-4 flex items-center gap-3">
        <Select
          allowClear
          showSearch
          placeholder="Lọc theo dự án / khu trọ"
          value={selectedProjectId}
          onChange={(value) => setSelectedProjectId(value)}
          optionFilterProp="children"
          style={{ width: 280 }}
        >
          {projects.map(project => (
            <Select.Option key={project.id} value={project.id}>
              {project.name}
            </Select.Option>
          ))}
        </Select>

        {selectedProjectId && (
          <Button onClick={() => setSelectedProjectId(undefined)}>
            Bỏ lọc
          </Button>
        )}
      </div>
      <Tabs defaultActiveKey="1" onChange={(key) => setActiveTab(key)} type="card">
        <TabPane tab={<span className="font-medium">Tin Đang Hoạt Động</span>} key="1">
          <Table
            dataSource={filteredActiveRooms}
            columns={activeColumns}
            rowKey="id"
            loading={loading && activeTab === '1'}
          />
        </TabPane>
        <TabPane tab={<span className="font-medium text-red-500"><DeleteOutlined /> Thùng Rác</span>} key="2">
          <Table
            dataSource={filteredTrashRooms}
            columns={trashColumns}
            rowKey="id"
            loading={loading && activeTab === '2'}
          />
        </TabPane>
      </Tabs>
    </div>
  );
};

export default RoomManagement;

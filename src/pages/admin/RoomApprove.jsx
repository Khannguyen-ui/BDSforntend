import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, Modal, Input, message, Image, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import adminService from '../../services/adminService';
import { getImageUrl } from '../../utils/imageHelper';

const RoomApprove = () => {
  const [rooms, setRooms] = useState([]); // [cite: 674]
  const [loading, setLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, roomId: null });
  const [reason, setReason] = useState("");
  const normalizePageData = (res) => {
    const raw =
      res?.data?.result?.content ||
      res?.data?.content ||
      res?.data?.data?.content ||
      res?.data?.result ||
      res?.data?.data ||
      [];

    return Array.isArray(raw) ? raw : [];
  };
  const fetchRooms = async () => {
    setLoading(true);
    try {
      console.log('🔄 Calling getPendingRooms...');
      const res = await adminService.getPendingRooms();
      console.log('✅ API Response:', res.data);



      const fetchRooms = async () => {
        setLoading(true);
        try {
          const res = await adminService.getPendingRooms();
          setRooms(normalizePageData(res));
        } catch (error) {
          console.error(error);
          message.error('Lỗi tải danh sách phòng chờ duyệt');
          setRooms([]);
        } finally {
          setLoading(false);
        }
      };

      if (Array.isArray(actualData)) {
        setRooms(actualData);
        console.log('📊 Loaded rooms:', actualData.length);
      } else {
        console.error("❌ Data not array:", actualData);
        setRooms([]);
      }
    } catch (error) {
      console.error("💥 Fetch Error:", {
        status: error.response?.status,
        message: error.response?.data?.message,
        url: error.config?.url
      });
      message.error(`Lỗi tải: ${error.response?.data?.message || error.message}`);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleApprove = async (id) => {
    try {
      await adminService.approveRoom(id, true); // approved = true [cite: 315]
      message.success("Đã duyệt phòng thành công!");
      fetchRooms();
    } catch (error) {
      message.error("Lỗi: " + (error.response?.data?.message || "Không thể duyệt"));
    }
  };

  const handleReject = async () => {
    if (!reason) return message.warning("Vui lòng nhập lý do từ chối");
    try {
      await adminService.approveRoom(rejectModal.roomId, false, reason); // approved = false [cite: 315]
      message.success("Đã từ chối phòng!");
      setRejectModal({ open: false, roomId: null });
      setReason("");
      fetchRooms();
    } catch (error) {
      message.error("Lỗi khi từ chối");
    }
  };

  const columns = [
    {
      title: 'Ảnh',
      key: 'images',
      render: (_, record) => {
        const src = getImageUrl(record);
        console.log(`[DEBUG Image] Record ID: ${record.id}, getImageUrl(record):`, src, `Raw images:`, record.images);

        // If it's a placeholder from imageHelper, just show the div
        if (!src || src.includes('via.placeholder.com')) {
          return <div className="w-[80px] h-[60px] bg-gray-200 flex items-center justify-center rounded text-xs text-gray-500">No Image</div>;
        }

        return (
          <Image
            src={src}
            width={80}
            height={60}
            className="object-cover rounded"
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
          />
        );
      }
    },
    { title: 'Tiêu đề', dataIndex: 'title', width: 250 },
    {
      title: 'Giá',
      dataIndex: 'price',
      render: (val) => <span className="text-blue-600 font-bold">{val?.toLocaleString()} đ</span>
    },
    { title: 'Chủ trọ', dataIndex: 'ownerId', render: (id) => `ID: ${id}` }, // Backend DTO has ownerId
    {
      title: 'Gói tin',
      dataIndex: 'promotionPackageId', // Backend DTO has promotionPackageId
      render: (id) => <Tag color="gold">Gói ID: {id || 'Không'}</Tag>
    },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Space>
          <Button type="primary" className="bg-green-600" icon={<CheckCircleOutlined />} onClick={() => handleApprove(record.id)}>
            Duyệt
          </Button>
          <Button danger icon={<CloseCircleOutlined />} onClick={() => setRejectModal({ open: true, roomId: record.id })}>
            Từ chối
          </Button>
        </Space>
      )
    }
  ];

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Danh Sách Chờ Duyệt</h2>
      <Table dataSource={rooms} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title="Từ chối duyệt tin"
        open={rejectModal.open}
        onOk={handleReject}
        onCancel={() => setRejectModal({ open: false, roomId: null })}
        okButtonProps={{
          danger: true,
          className: "bg-red-500 hover:bg-red-600 text-white"
        }}
      >
        <p>Lý do từ chối:</p>
        <Input.TextArea rows={4} value={reason} onChange={e => setReason(e.target.value)} />
      </Modal>
    </div>
  );
};

export default RoomApprove;
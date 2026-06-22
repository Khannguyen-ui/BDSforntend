import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Select, InputNumber, message } from 'antd';
import { FilePdfOutlined, PlusOutlined } from '@ant-design/icons';
import contractService from '../../services/contractService';
import roomService from '../../services/roomService'; // Giả sử đã có để lấy phòng của tôi

const ContractManagement = () => {
  const [contracts, setContracts] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Load phòng của chủ trọ để chọn khi tạo hợp đồng
  useEffect(() => {
    roomService.getMyRooms().then(res => setMyRooms(res.data)).catch(() => { });
    // contractService.getMyContracts().then(res => setContracts(res.data)); // Nếu có API
  }, []);

  const handleCreateContract = async (values) => {
    try {
      const payload = {
        ...values,
        startDate: values.dates[0].format('YYYY-MM-DD'),
        endDate: values.dates[1].format('YYYY-MM-DD'),
        // Mapping phí dịch vụ cơ bản
        electricPrice: values.electricPrice,
        waterPrice: values.waterPrice,
      };
      await contractService.createContract(payload);
      message.success("Hợp đồng đã được tạo!");
      setIsModalOpen(false);
    } catch (error) {
      message.error(error.response?.data?.message || "Lỗi tạo hợp đồng");
    }
  };

  const columns = [
    { title: 'Phòng', dataIndex: 'roomTitle' },
    { title: 'Người thuê', dataIndex: 'tenantName' },
    { title: 'Ngày bắt đầu', dataIndex: 'startDate' },
    { title: 'Ngày kết thúc', dataIndex: 'endDate' },
    { title: 'Trạng thái', dataIndex: 'status' },
    {
      title: 'Hành động',
      render: (_, record) => (
        <Button
          icon={<FilePdfOutlined />}
          href={`${import.meta.env.VITE_API_URL}/api/contracts/${record.id}/pdf`}
          target="_blank"
        >
          Xuất PDF
        </Button>

      )
    }
  ];

  return (
    <div className="p-4 bg-white shadow rounded">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Quản lý Hợp Đồng</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Tạo Hợp đồng mới
        </Button>
      </div>

      <Table dataSource={contracts} columns={columns} rowKey="id" />

      <Modal title="Tạo Hợp đồng thuê phòng" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={form.submit} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreateContract}>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="roomId" label="Chọn phòng" rules={[{ required: true }]}>
              <Select options={myRooms.map(r => ({ label: r.title, value: r.id }))} />
            </Form.Item>
            <Form.Item name="tenantEmail" label="Email người thuê" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="Người thuê phải có tài khoản" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="monthlyRent" label="Giá thuê/tháng" rules={[{ required: true }]}>
              <InputNumber className="w-full" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Form.Item name="depositAmount" label="Tiền cọc" rules={[{ required: true }]}>
              <InputNumber className="w-full" formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </div>

          <Form.Item name="dates" label="Thời hạn hợp đồng" rules={[{ required: true }]}>
            <DatePicker.RangePicker className="w-full" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="electricPrice" label="Giá điện (kwh)" initialValue={3500}>
              <InputNumber className="w-full" />
            </Form.Item>
            <Form.Item name="waterPrice" label="Giá nước (khối)" initialValue={15000}>
              <InputNumber className="w-full" />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default ContractManagement;
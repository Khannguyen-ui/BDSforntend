import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Tag } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import billService from '../../services/billService';

const BillManagement = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // Dữ liệu giả định (Thực tế gọi API lấy danh sách Bill)
  const [bills, setBills] = useState([]); 

  const handleCreateBill = async (values) => {
    try {
      await billService.createBill(values);
      message.success("Đã lập hóa đơn và gửi thông báo!");
      setIsModalOpen(false);
      // fetchBills(); // Gọi lại API reload bảng
    } catch (error) {
      message.error("Lỗi tạo hóa đơn");
    }
  };

  const columns = [
    { title: 'Phòng', dataIndex: 'roomTitle' },
    { title: 'Tháng/Năm', render: (_, r) => `${r.month}/${r.year}` },
    { title: 'Tổng tiền', dataIndex: 'totalAmount', render: (v) => <b className="text-red-500">{v?.toLocaleString()} đ</b> },
    { title: 'Trạng thái', dataIndex: 'status', render: (s) => <Tag color={s === 'PAID' ? 'green' : 'red'}>{s}</Tag> },
  ];

  return (
    <div className="p-4 bg-white shadow rounded">
       <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Quản lý Hóa Đơn</h2>
        <Button type="primary" icon={<DollarOutlined />} onClick={() => setIsModalOpen(true)}>
          Lập hóa đơn tháng
        </Button>
      </div>

      <Table dataSource={bills} columns={columns} rowKey="id" />

      <Modal title="Lập hóa đơn điện nước" open={isModalOpen} onCancel={() => setIsModalOpen(false)} onOk={form.submit}>
        <Form form={form} layout="vertical" onFinish={handleCreateBill}>
           <Form.Item name="contractId" label="Mã Hợp đồng (ID)" rules={[{ required: true }]}>
             <InputNumber className="w-full" placeholder="Nhập ID hợp đồng" />
           </Form.Item>
           <div className="grid grid-cols-2 gap-4">
             <Form.Item name="month" label="Tháng" initialValue={new Date().getMonth() + 1}>
               <InputNumber className="w-full" min={1} max={12} />
             </Form.Item>
             <Form.Item name="year" label="Năm" initialValue={new Date().getFullYear()}>
               <InputNumber className="w-full" />
             </Form.Item>
           </div>
           <div className="grid grid-cols-2 gap-4">
             <Form.Item name="electricNew" label="Số điện mới" rules={[{ required: true }]}>
               <InputNumber className="w-full" />
             </Form.Item>
             <Form.Item name="waterNew" label="Số nước mới" rules={[{ required: true }]}>
               <InputNumber className="w-full" />
             </Form.Item>
           </div>
        </Form>
      </Modal>
    </div>
  );
};

export default BillManagement;
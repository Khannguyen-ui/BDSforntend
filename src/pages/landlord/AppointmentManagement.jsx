import React, { useEffect, useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Space,
  message,
  Popconfirm,
  Tabs,
  Avatar,
  Tooltip,
  Modal,
  Radio,
  DatePicker,
  Input
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  HomeOutlined,
  PhoneOutlined,
  SyncOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import appointmentService from '../../services/appointmentService';

// --- COMPONENT CON: MODAL TỪ CHỐI / ĐỀ XUẤT ---
const RejectModal = ({ open, onClose, onFinish }) => {
  const [actionType, setActionType] = useState('REJECT'); // REJECT | SUGGEST
  const [newTime, setNewTime] = useState(null);
  const [note, setNote] = useState('');

  const handleOk = () => {
    if (actionType === 'SUGGEST' && !newTime) {
      return message.error('Vui lòng chọn giờ mới!');
    }

    onFinish(actionType, newTime, note);

    setNote('');
    setNewTime(null);
    setActionType('REJECT');
  };

  return (
    <Modal
      title="Xử lý yêu cầu này"
      open={open}
      onCancel={onClose}
      onOk={handleOk}
      okText="Xác nhận"
      cancelText="Hủy"
    >
      <div className="mb-4">
        <Radio.Group
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="flex flex-col gap-2"
        >
          <Radio value="REJECT">Từ chối thẳng / hủy lịch</Radio>
          <Radio value="SUGGEST">Đề xuất giờ khác</Radio>
        </Radio.Group>
      </div>

      {actionType === 'SUGGEST' && (
        <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-100">
          <div className="text-xs font-bold text-blue-600 mb-1">
            Chọn thời gian bạn rảnh:
          </div>
          <DatePicker
            showTime={{ format: 'HH:mm' }}
            format="YYYY-MM-DD HH:mm"
            className="w-full"
            value={newTime}
            onChange={(val) => setNewTime(val)}
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </div>
      )}

      <Input.TextArea
        rows={3}
        placeholder={
          actionType === 'REJECT'
            ? 'Nhập lý do từ chối...'
            : 'Nhắn đôi lời với khách...'
        }
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Modal>
  );
};

// --- COMPONENT CHÍNH ---
const AppointmentManagement = () => {
  const [loading, setLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState([]);
  const [receivedRequests, setReceivedRequests] = useState([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState(null);

  const getAppointmentTime = (record) => {
    return record.appointmentTime || record.scheduledAt;
  };

  const getPropertyLabel = (record) => {
    return `Bất động sản #${record.propertyId}`;
  };

  const getPartnerLabel = (record) => {
    return `Người dùng #${record.partnerId}`;
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentService.getMyCalendar();
      const raw = res.data?.result || res.data || [];
      const allData = Array.isArray(raw) ? raw : [];

      setSentRequests(allData.filter((item) => item.myRequest === true));
      setReceivedRequests(allData.filter((item) => item.myRequest === false));
    } catch (error) {
      console.error('Lỗi tải lịch hẹn:', error);
      message.error(error.response?.data?.message || 'Lỗi tải lịch hẹn');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await appointmentService.updateStatus(id, status);
      message.success('Cập nhật thành công!');
      fetchAppointments();
    } catch (error) {
      console.error('Lỗi cập nhật lịch hẹn:', error);
      message.error(error.response?.data?.message || 'Lỗi cập nhật');
    }
  };

  const openRejectModal = (id) => {
    setSelectedApptId(id);
    setModalVisible(true);
  };

  const handleModalFinish = async (type, newTime, note) => {
    try {
      if (type === 'REJECT') {
        await appointmentService.updateStatus(selectedApptId, 'CANCELLED');
        message.success('Đã từ chối lịch hẹn.');
      } else {
        const formattedTime = newTime.format('YYYY-MM-DDTHH:mm:ss');
        await appointmentService.suggestNewTime(selectedApptId, formattedTime, note);
        message.success('Đã gửi đề xuất giờ mới!');
      }

      setModalVisible(false);
      fetchAppointments();
    } catch (error) {
      console.error('Lỗi xử lý lịch hẹn:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra');
    }
  };

  const handleAcceptSuggestion = async (id) => {
    try {
      await appointmentService.acceptSuggestion(id);
      message.success('Đã chốt lịch hẹn mới!');
      fetchAppointments();
    } catch (error) {
      console.error('Lỗi xác nhận giờ đề xuất:', error);
      message.error(error.response?.data?.message || 'Lỗi xác nhận');
    }
  };

  const renderStatus = (status, record) => {
    if (status === 'SUGGESTED') {
      return (
        <Tooltip title="Chủ trọ muốn đổi giờ. Bấm đồng ý để chốt.">
          <Tag color="geekblue" icon={<ExclamationCircleOutlined />}>
            Chủ đề xuất lại:
            <br />
            <b>
              {record.suggestedTime
                ? dayjs(record.suggestedTime).format('HH:mm DD/MM')
                : 'Chưa có giờ'}
            </b>
          </Tag>
        </Tooltip>
      );
    }

    switch (status) {
      case 'PENDING':
        return (
          <Tag color="orange" icon={<ClockCircleOutlined />}>
            Chờ xác nhận
          </Tag>
        );
      case 'ACCEPTED':
        return (
          <Tag color="green" icon={<CheckCircleOutlined />}>
            Đã chốt lịch
          </Tag>
        );
      case 'REJECTED':
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Đã từ chối
          </Tag>
        );
      case 'CANCELLED':
        return (
          <Tag color="red" icon={<CloseCircleOutlined />}>
            Đã hủy
          </Tag>
        );
      case 'COMPLETED':
        return (
          <Tag color="purple" icon={<CheckCircleOutlined />}>
            Hoàn tất
          </Tag>
        );
      default:
        return <Tag>{status || 'Không rõ'}</Tag>;
    }
  };

  // --- TAB 1: KHÁCH HẸN TÔI ---
  const receivedColumns = [
    {
      title: 'Khách hàng',
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Avatar icon={<UserOutlined />} />
          <div>
            <div className="font-bold">{getPartnerLabel(r)}</div>
            <div className="text-xs text-gray-500">ID khách: {r.userId}</div>
          </div>
        </div>
      )
    },
    {
      title: 'Bất động sản & Lời nhắn',
      render: (_, r) => (
        <div className="max-w-[260px]">
          <div
            className="text-blue-700 font-medium truncate"
            title={getPropertyLabel(r)}
          >
            {getPropertyLabel(r)}
          </div>
          <div className="text-xs text-gray-500 italic mt-1">
            "{r.note || 'Không có lời nhắn'}"
          </div>
        </div>
      )
    },
    {
      title: 'Giờ hẹn',
      render: (_, r) => {
        const time = getAppointmentTime(r);
        return (
          <span className="font-semibold text-orange-600">
            {time ? dayjs(time).format('HH:mm - DD/MM/YYYY') : 'Chưa có giờ'}
          </span>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status, record) => renderStatus(status, record)
    },
    {
      title: 'Hành động',
      render: (_, r) => {
        if (r.status === 'PENDING') {
          return (
            <Space>
              <Button
                type="primary"
                size="small"
                className="bg-green-600"
                onClick={() => handleUpdateStatus(r.id, 'ACCEPTED')}
              >
                Duyệt
              </Button>
              <Button danger size="small" onClick={() => openRejectModal(r.id)}>
                Từ chối...
              </Button>
            </Space>
          );
        }

        if (r.status === 'SUGGESTED') {
          return (
            <span className="text-gray-400 italic text-xs">
              Đang chờ khách chốt lại...
            </span>
          );
        }

        return null;
      }
    }
  ];

  // --- TAB 2: LỊCH HẸN CỦA TÔI ---
  const sentColumns = [
    {
      title: 'Chủ bài',
      render: (_, r) => (
        <div className="flex items-center gap-2">
          <Avatar
            shape="square"
            icon={<HomeOutlined />}
            className="bg-purple-100 text-purple-600"
          />
          <div>
            <div className="font-bold">{getPartnerLabel(r)}</div>
            {r.status === 'ACCEPTED' ? (
              <div className="text-xs text-green-600 font-bold">
                <PhoneOutlined /> Liên hệ chủ bài
              </div>
            ) : (
              <div className="text-xs text-gray-400">Thông tin hiện khi duyệt</div>
            )}
          </div>
        </div>
      )
    },
    {
      title: 'Bất động sản đã đặt',
      render: (_, r) => (
        <div
          className="text-blue-700 font-medium truncate max-w-[220px]"
          title={getPropertyLabel(r)}
        >
          {getPropertyLabel(r)}
        </div>
      )
    },
    {
      title: 'Giờ hẹn',
      render: (_, r) => {
        const time = getAppointmentTime(r);
        return (
          <div>
            <div
              className={
                r.status === 'SUGGESTED'
                  ? 'line-through text-gray-400 text-xs'
                  : 'font-semibold text-blue-600'
              }
            >
              {time ? dayjs(time).format('HH:mm - DD/MM') : 'Chưa có giờ'}
            </div>

            {r.status === 'SUGGESTED' && r.suggestedTime && (
              <div className="text-xs text-blue-600 mt-1">
                Giờ mới: {dayjs(r.suggestedTime).format('HH:mm - DD/MM')}
              </div>
            )}
          </div>
        );
      }
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status, record) => renderStatus(status, record)
    },
    {
      title: 'Hành động',
      render: (_, r) => {
        if (r.status === 'SUGGESTED') {
          return (
            <Space direction="vertical" size={0}>
              <Button
                type="primary"
                size="small"
                className="bg-blue-600 mb-1"
                onClick={() => handleAcceptSuggestion(r.id)}
              >
                Đồng ý giờ mới
              </Button>
              <Button
                type="text"
                danger
                size="small"
                onClick={() => handleUpdateStatus(r.id, 'CANCELLED')}
              >
                Không, hủy lịch
              </Button>
            </Space>
          );
        }

        if (r.status === 'PENDING' || r.status === 'ACCEPTED') {
          return (
            <Popconfirm
              title="Hủy lịch này?"
              okText="Hủy lịch"
              cancelText="Không"
              onConfirm={() => handleUpdateStatus(r.id, 'CANCELLED')}
            >
              <Button type="dashed" danger size="small">
                Hủy
              </Button>
            </Popconfirm>
          );
        }

        return null;
      }
    }
  ];

  return (
    <div className="p-4 bg-white shadow rounded-lg min-h-[500px]">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Lịch Hẹn</h2>
        <Button icon={<SyncOutlined />} onClick={fetchAppointments} loading={loading}>
          Làm mới
        </Button>
      </div>

      <Tabs
        defaultActiveKey="1"
        type="card"
        items={[
          {
            key: '1',
            label: `Khách hẹn tôi (${receivedRequests.filter((r) => r.status === 'PENDING').length})`,
            children: (
              <Table
                dataSource={receivedRequests}
                columns={receivedColumns}
                rowKey="id"
                loading={loading}
              />
            )
          },
          {
            key: '2',
            label: `Lịch hẹn của tôi (${sentRequests.filter((r) => r.status === 'SUGGESTED' || r.status === 'ACCEPTED').length})`,
            children: (
              <Table
                dataSource={sentRequests}
                columns={sentColumns}
                rowKey="id"
                loading={loading}
              />
            )
          }
        ]}
      />

      <RejectModal
        open={modalVisible}
        onClose={() => setModalVisible(false)}
        onFinish={handleModalFinish}
      />
    </div>
  );
};

export default AppointmentManagement;
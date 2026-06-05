import React, { useState } from 'react';
import { Modal, Form, DatePicker, TimePicker, Input, Button, message } from 'antd';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import appointmentService from '../../services/appointmentService';
import chatService from '../../services/chatService';

const BookingModal = ({ visible, onClose, room, user }) => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const isOwnRoom = user && room && String(user.id) === String(room.ownerId);

  const handleOk = async (values) => {
    // 1. Kiểm tra đăng nhập
    if (!user) {
      Modal.warning({
        title: "Yêu cầu đăng nhập",
        content: "Bạn cần đăng nhập để đặt lịch xem phòng.",
        okText: "Đăng nhập ngay",
        onOk: () => navigate('/login')
      });
      return;
    }
    if (isOwnRoom) {
      message.warning("Bạn không thể đặt lịch xem bài đăng của chính mình.");
      onClose();
      return;
    }

    setLoading(true);
    try {
      // 2. Xử lý gộp Ngày + Giờ
      // values.date và values.time là dayjs object
      let finalDateTime = values.date;

      // Set giờ, phút, giây vào ngày đã chọn
      finalDateTime = finalDateTime
        .hour(values.time.hour())
        .minute(values.time.minute())
        .second(0);


      if (finalDateTime.isBefore(dayjs())) {
        message.error("Thời gian đặt lịch phải ở tương lai!");
        setLoading(false);
        return;
      }

      // 3. Chuẩn bị dữ liệu (Chuẩn ISO 8601 có chữ T ở giữa để Java LocalDateTime đọc được)
      const appointmentData = {
        propertyId: room.id,
        appointmentTime: finalDateTime.format('YYYY-MM-DDTHH:mm:ss'),
        note: values.note || ''
      };

      console.log("📦 Dữ liệu đặt lịch gửi backend:", appointmentData);

      await appointmentService.create(appointmentData);

      message.success("Đã gửi yêu cầu đặt lịch cho chủ trọ!");
      form.resetFields();
      onClose();


      try {
        const ownerId = room?.ownerId;
        if (ownerId) {
          const chatMessage = `Xin chào! Tôi đã đặt lịch "${room.title}" vào lúc ${finalDateTime.format('HH:mm - DD/MM/YYYY')}.`;
          await chatService.startConversation(ownerId);
          await chatService.sendMessage(ownerId, chatMessage, "TEXT");
        }
      } catch (chatError) {
        console.warn("Đặt lịch thành công nhưng gửi chat thất bại:", chatError);
      }

    } catch (error) {
      console.error("Lỗi đặt lịch:", error);
      // Lấy thông báo lỗi từ Backend (GlobalExceptionHandler trả về)
      const errorMsg = error.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại.";
      // Nếu có chi tiết lỗi validate
      const errorDetails = error.response?.data?.details || "";

      message.error(`${errorMsg} ${errorDetails}`);
    } finally {
      setLoading(false);
    }
  };

  // Hàm hiển thị lỗi nếu Form thiếu thông tin (Required)
  const onValidationFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
    message.error("Vui lòng điền đầy đủ thông tin bắt buộc!");
  };

  return (
    <Modal
      title="Đặt lịch xem phòng"
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
    >
      {/* Thông tin tóm tắt phòng */}
      <div className="mb-5 bg-orange-50 p-4 rounded-lg border border-orange-100 flex justify-between items-center">
        <div className="overflow-hidden">
          <h4 className="font-bold text-gray-800 text-sm truncate">{room?.title}</h4>
          <p className="text-gray-500 text-xs mt-1 truncate">{room?.address}</p>
        </div>
        <div className="text-[#f96302] font-bold whitespace-nowrap ml-4">
          {room?.price?.toLocaleString()} đ
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleOk}
        onFinishFailed={onValidationFailed}
      >
        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            label="Ngày xem mong muốn"
            name="date"
            rules={[{ required: true, message: 'Vui lòng chọn ngày' }]}
          >
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              // Chặn ngày quá khứ (Cho phép chọn hôm nay)
              disabledDate={(current) => current && current < dayjs().startOf('day')}
              placeholder="Chọn ngày"
            />
          </Form.Item>
          <Form.Item
            label="Giờ xem"
            name="time"
            rules={[{ required: true, message: 'Vui lòng chọn giờ' }]}
          >
            <TimePicker
              className="w-full"
              format="HH:mm"
              minuteStep={15}
              placeholder="Chọn giờ"
              showNow={false} // Ẩn nút "Now" để user phải chọn tay
              popupClassName="custom-time-picker-dropdown"
            />
          </Form.Item>
        </div>

        <Form.Item label="Lời nhắn cho chủ trọ" name="note">
          <Input.TextArea
            rows={3}
            placeholder="Ví dụ: Mình muốn xem phòng vào giờ nghỉ trưa, khoảng 12h30..."
          />
        </Form.Item>

        <Form.Item label="Thông tin liên hệ của bạn">
          <Input value={user?.fullName || ''} disabled prefix="Họ tên:" className="mb-2 bg-gray-50 text-gray-700" />
          <Input value={user?.phone || ''} disabled prefix="SĐT:" className="bg-gray-50 text-gray-700" />
          <div className="text-xs text-gray-400 mt-1 italic">*Thông tin lấy từ hồ sơ cá nhân của bạn</div>
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          disabled={isOwnRoom}
          block
          size="large"
          className="bg-[#f96302] hover:bg-orange-600 border-none h-10 font-bold uppercase shadow-sm"
        >
           {isOwnRoom ? "Không thể đặt lịch bài của bạn" : "Gửi yêu cầu đặt lịch"}
        </Button>
      </Form>
    </Modal>
  );
};

export default BookingModal;
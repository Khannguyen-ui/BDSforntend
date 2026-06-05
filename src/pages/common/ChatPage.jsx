import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Layout, Avatar, Input, Button, Spin, Typography, Empty, Badge, message, Tooltip, Tag,
  Upload, Image, Dropdown, Modal, DatePicker, Form, Select
} from 'antd';
import {
  SendOutlined, UserOutlined, SearchOutlined, MoreOutlined, CheckCircleFilled,
  PictureOutlined, CalendarOutlined, MessageOutlined
} from '@ant-design/icons';
// Đã xóa SockJS và StompJS cục bộ vì đã chuyển qua SocketContext
import dayjs from 'dayjs';

// Import hooks & services
import useAuth from '../../hooks/useAuth';
import chatService from '../../services/chatService';
import uploadService from '../../services/uploadService';
import roomService from '../../services/roomService';
import appointmentService from '../../services/appointmentService';
import { useSocket } from '../../contexts/SocketContext';
import axiosClient from '../../config/axiosClient';

const { Sider, Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;

const ChatPage = () => {
  const { user } = useAuth();

  const currentUserId = user?.id || user?.userId || user?.sub;

  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  // --- STATE ---
  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { isConnected, lastMessage, sendChatMessage } = useSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [rooms, setRooms] = useState([]); // 🟢 State lưu danh sách phòng thật

  // --- STATE MODAL LỊCH HẸN ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);

  // --- REFS ---
  const messagesEndRef = useRef(null);


  useEffect(() => {
    if (lastMessage) {
      handleIncomingMessage(lastMessage);
    }
  }, [lastMessage, selectedPartner, currentUserId]);

  // 2. LOAD DỮ LIỆU
  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchRooms();
    }
  }, [currentUserId]);

  // 3. TỰ ĐỘNG MỞ CUỘC HỘI THOẠI NẾU ĐƯỢC ĐIỀU HƯỚNG TỪ TRANG CHI TIẾT PHÒNG HOẶC TỪ THÔNG BÁO
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const userIdParam = searchParams.get('userId');
    const openPartnerId = location.state?.openPartnerId || userIdParam;

    if (!openPartnerId || conversations.length === 0) return;

    const partner = conversations.find(c => {
      const pid = c.partnerId || c.userId || c.id;
      return String(pid) === String(openPartnerId);
    });

    if (partner) {
      setSelectedPartner(partner);
      // Xóa state và param để không tự mở lại khi F5
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [conversations, location.state, location.search, navigate, location.pathname]);

  // 🟢 HÀM LẤY DANH SÁCH PHÒNG THẬT TỪ BACKEND
  const fetchRooms = async () => {
    if (!currentUserId) return;
    try {
      const res = await roomService.getMyRooms(currentUserId);
      console.log(' getMyRooms raw axios response:', res);
      console.log(' Dữ liệu phòng nhận được:', res.data);
      setRooms(res.data || []);
    } catch (error) {
      console.error(' Không thể tải danh sách phòng:', error?.response?.data || error.message);
    }
  };
  useEffect(() => {
    if (selectedPartner) {
      const targetId = selectedPartner.partnerId || selectedPartner.userId || selectedPartner.id;
      if (!targetId) return;
      setLoadingHistory(true);
      chatService.getChatHistory(targetId)
        .then(res => setMessages(res.data || res || []))
        .catch(err => console.error(err))
        .finally(() => setLoadingHistory(false));

      // 🟢 Đánh dấu đã đọc khi mở hội thoại
      chatService.markAsRead(targetId)
        .then(() => fetchConversations())
        .catch(err => console.error("Lỗi đánh dấu đã đọc:", err));
    }
  }, [selectedPartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await chatService.getConversations();
      const rawList = res.data || [];

      // Enrich: tự gọi customer-service để lấy tên thật thay vì phụ thuộc Feign ở backend
      const enriched = await Promise.all(
        rawList.map(async (conv) => {
          const partnerId = conv.partnerId || conv.id;
          // Chỉ gọi API nếu tên vẫn là dạng fallback "User X" hoặc avatar rỗng
          const needsEnrich = !conv.fullName || conv.fullName === `User ${partnerId}` || !conv.avatar;
          if (needsEnrich && partnerId) {
            try {
              const summaryRes = await axiosClient.get(`/customers/${partnerId}/summary`);
              const summary = summaryRes.data?.result || summaryRes.data;
              return {
                ...conv,
                fullName: summary?.fullName || conv.fullName,
                avatar: summary?.avatarUrl || conv.avatar,
              };
            } catch {
              return conv; // Giữ nguyên nếu lỗi
            }
          }
          return conv;
        })
      );

      setConversations(enriched);
    } catch (error) {
      console.error('❌ fetchConversations error:', error);
      setConversations([]);
    }
  };

  const filteredConversations = conversations.filter(item =>
    item.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const handleCreateAppointment = async (values) => {
    if (!selectedPartner) return;
    const targetId = selectedPartner.partnerId || selectedPartner.userId || selectedPartner.id;
    if (!targetId) return;
    setSubmittingAppointment(true);
    try {
      const appointmentData = {
        propertyId: values.roomId,
        appointmentTime: values.dateTime[0].format('YYYY-MM-DDTHH:mm:ss'),
        note: values.note || "Khách muốn hẹn xem phòng"
      };

      const res = await appointmentService.create(appointmentData);

      if (res) {
        // Logic gửi tin nhắn qua WebSocket và hiển thị UI giữ nguyên...
        const selectedRoom = rooms.find(r => r.id === values.roomId);
        const timeStr = values.dateTime[0].format('DD/MM/YYYY HH:mm');
        const chatContent = `📅 **LỊCH HẸN HỆ THỐNG**\n📌 ${values.title}\n📍 Phòng: ${selectedRoom?.title}\n⏰ ${timeStr}\n📝 ${values.note || 'Không có ghi chú'}`;

        sendChatMessage({
          senderId: currentUserId,
          receiverId: targetId,
          content: chatContent,
          type: 'TEXT'
        });

        message.success("Đã tạo lịch hẹn và lưu vào hệ thống!");
        setIsModalOpen(false);
        form.resetFields();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || "Lỗi kết nối hệ thống";
      message.error(errorMsg);
    } finally {
      setSubmittingAppointment(false);
    }
  };

  // --- LOGIC CHAT ---
  const handleIncomingMessage = (msg) => {
    const targetId =
      selectedPartner?.partnerId ||
      selectedPartner?.userId ||
      selectedPartner?.id;

    if (!targetId || !currentUserId) {
      fetchConversations();
      return;
    }

    const isCurrentChat =
      (String(msg.senderId) === String(currentUserId) &&
        String(msg.receiverId) === String(targetId)) ||
      (String(msg.senderId) === String(targetId) &&
        String(msg.receiverId) === String(currentUserId));

    if (isCurrentChat) {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    }

    fetchConversations();
  };

  const handleImageUpload = async (info) => {
    const file = info.file;
    const targetId = selectedPartner?.partnerId || selectedPartner?.userId || selectedPartner?.id;
    if (!targetId) return;
    try {
      message.loading({ content: 'Đang gửi ảnh...', key: 'upload_chat' });
      const imageUrl = await uploadService.uploadImage(file);


      const optimisticMsg = { senderId: currentUserId, receiverId: targetId, content: imageUrl, type: 'IMAGE', createdAt: new Date().toISOString() };
      setMessages(prev => [...prev, optimisticMsg]);

      // Gửi qua HTTP REST để Backend lưu DB + broadcast WebSocket
      await chatService.sendMessage(targetId, imageUrl, 'IMAGE');
      message.success({ content: 'Đã gửi ảnh', key: 'upload_chat' });
    } catch (error) { message.error({ content: 'Lỗi gửi ảnh', key: 'upload_chat' }); }
  };

  const handleSend = async () => {
    const targetId = selectedPartner?.partnerId || selectedPartner?.userId || selectedPartner?.id;
    if (!inputText.trim() || !targetId) return;

    const textToSend = inputText;
    setInputText(''); // Xóa ô nhập sớm để UX mượt

    // Hiển thị tức thì (Optimistic Update)
    const optimisticMsg = { senderId: currentUserId, receiverId: targetId, content: textToSend, type: 'TEXT', createdAt: new Date().toISOString() };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Gửi qua HTTP REST để Backend lưu DB + broadcast WebSocket cho bên kia
      await chatService.sendMessage(targetId, textToSend, 'TEXT');
    } catch (error) {
      console.error('Gửi tin nhắn thất bại:', error);
      message.error('Không thể gửi tin nhắn. Vui lòng thử lại!');
      // Rollback tin nhắn nếu thất bại
      setMessages(prev => prev.filter(m => m !== optimisticMsg));
      setInputText(textToSend);
    }
  };

  const menuItems = [
    {
      key: 'appointment',
      label: 'Tạo lịch hẹn hệ thống',
      icon: <CalendarOutlined />,
      onClick: () => setIsModalOpen(true),
    },
  ];

  return (
    <Layout className="h-[calc(100vh-80px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm m-4">

      {/* SIDEBAR TRÁI */}
      <Sider width={240} theme="light" className="border-r border-gray-200 flex flex-col h-full">
        <div className="p-3 border-b bg-gray-50 flex items-center gap-2 flex-shrink-0">
          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Tìm kiếm..."
            className="rounded-md flex-1 border-none bg-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
          <Tooltip title={isConnected ? "Đã kết nối" : "Mất kết nối"}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center px-4">
              <MessageOutlined style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }} />
              Chưa có cuộc trò chuyện nào
            </div>
          ) : filteredConversations.map((item, idx) => {
            // Backend (HEAD): dùng field 'id' cho partnerId | (branch): dùng 'partnerId'
            const itemId = item.partnerId || item.userId || item.id;
            const targetId = selectedPartner?.partnerId || selectedPartner?.userId || selectedPartner?.id;
            const isActive = targetId && String(targetId) === String(itemId);
            const unread = item.unreadCount || 0;
            return (
              <div
                key={itemId || idx}
                onClick={() => setSelectedPartner(item)}
                className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50
                  ${isActive ? 'bg-blue-50 border-r-4 border-r-blue-600' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <Avatar size={40} src={item.avatar} icon={<UserOutlined />} />
                  {unread > 0 && !isActive && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Text strong={unread > 0 && !isActive} className="truncate text-gray-800 block text-[14px]">{item.fullName}</Text>
                  {item.lastMessage && (
                    <Text className={`text-[11px] truncate block ${unread > 0 && !isActive ? 'text-gray-700 font-semibold' : 'text-gray-400'}`}>
                      {item.lastMessage}
                    </Text>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Sider>

      {/* KHUNG CHAT PHẢI */}
      <Content className="flex flex-col bg-[#F5F7FB]">
        {selectedPartner ? (
          <>
            <div className="h-16 px-6 bg-white border-b flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <Avatar src={selectedPartner.avatar} icon={<UserOutlined />} />
                <div className="font-bold text-gray-800 text-base">{selectedPartner.fullName}</div>
              </div>

              <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                <Button icon={<MoreOutlined />} type="text" className="text-gray-500" />
              </Dropdown>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory ? <div className="text-center mt-4"><Spin /></div> :
                messages.length === 0 ? <Empty description="Bắt đầu trò chuyện ngay!" className="mt-10" /> :
                  messages.map((msg, index) => {
                    const isMe = currentUserId && String(msg.senderId) === String(currentUserId);
                    const isImage = msg.type === 'IMAGE';
                    const isCard = msg.type === 'PROPERTY_CARD';

                    // --- Render Property Card ---
                    if (isCard) {
                      let card = null;
                      try { card = JSON.parse(msg.content); } catch { card = null; }
                      return (
                        <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {!isMe && <Avatar size="small" src={selectedPartner.avatar} icon={<UserOutlined />} className="mr-2 mt-auto mb-1" />}
                          <div
                            onClick={() => navigate(`/rooms/${card?.id}`)}
                            className={`max-w-[280px] rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow
                              ${isMe ? 'rounded-br-none' : 'rounded-bl-none'}`}
                          >
                            {card?.image ? (
                              <img src={card.image} alt={card.title} className="w-full h-36 object-cover" />
                            ) : (
                              <div className="w-full h-36 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">Không có ảnh</div>
                            )}
                            <div className={`p-3 ${isMe ? 'bg-[#E03C31]' : 'bg-white border'}`}>
                              <div className={`font-bold text-sm leading-snug mb-1 line-clamp-2 ${isMe ? 'text-white' : 'text-gray-800'}`}>
                                {card?.title}
                              </div>
                              <div className={`text-sm font-semibold ${isMe ? 'text-red-100' : 'text-[#E03C31]'}`}>
                                {card?.price?.toLocaleString('vi-VN')} đ/tháng
                              </div>
                              <div className={`text-[11px] mt-1 truncate ${isMe ? 'text-red-200' : 'text-gray-500'}`}>
                                📍 {card?.address}
                              </div>
                              <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-red-200' : 'text-gray-400'}`}>
                                {dayjs(msg.createdAt).format('HH:mm')}
                                {isMe && <CheckCircleFilled className="ml-1 text-[10px]" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // --- Render Text / Image thường ---
                    return (
                      <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {!isMe && <Avatar size="small" src={selectedPartner.avatar} icon={<UserOutlined />} className="mr-2 mt-auto mb-1" />}
                        <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-sm relative whitespace-pre-wrap
                        ${isMe ? 'bg-[#E03C31] text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border'}`}
                        >
                          {isImage ? <Image src={msg.content} className="rounded-lg max-h-60 object-cover" /> : msg.content}
                          <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-red-100' : 'text-gray-400'}`}>
                            {dayjs(msg.createdAt).format('HH:mm')}
                            {isMe && <CheckCircleFilled className="ml-1 text-[10px]" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
              }
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t flex items-center gap-2">
              <Upload customRequest={handleImageUpload} showUploadList={false} accept="image/*">
                <Button icon={<PictureOutlined />} type="text" className="text-gray-500 hover:text-blue-500" />
              </Upload>
              <Input
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onPressEnter={handleSend}
                placeholder="Nhập tin nhắn..."
                className="rounded-full bg-gray-100 border-none h-10 px-4 flex-1"
              />
              <Button type="primary" shape="circle" size="large" icon={<SendOutlined />} onClick={handleSend}
                className="bg-[#E03C31] border-[#E03C31]" />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <SendOutlined style={{ fontSize: 40, color: '#E03C31' }} />
            </div>
            {conversations.length === 0 ? (
              <>
                <Text className="text-lg text-gray-700 font-semibold mb-2">Bạn chưa có cuộc trò chuyện nào</Text>
                <Text className="text-sm text-gray-500 max-w-md mb-6">
                  Hãy truy cập trang chi tiết phòng trọ mà bạn quan tâm và chọn nút <strong className="text-[#E03C31]">"Chat với chủ trọ"</strong> để bắt đầu trao đổi trực tiếp!
                </Text>
                <Button
                  type="primary"
                  size="large"
                  className="bg-[#E03C31] border-[#E03C31] rounded-full px-6 font-medium"
                  onClick={() => navigate('/search')}
                >
                  Tìm phòng trọ ngay
                </Button>
              </>
            ) : (
              <Text className="text-lg">Chọn một cuộc hội thoại để bắt đầu</Text>
            )}
          </div>
        )}
      </Content>

      {/* 🟢 MODAL TẠO LỊCH HẸN HỆ THỐNG */}
      <Modal
        title={<div className="text-[#E03C31]"><CalendarOutlined className="mr-2" /> Tạo lịch hẹn hệ thống</div>}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submittingAppointment}
        okText="Xác nhận lưu lịch"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-[#E03C31] border-[#E03C31]' }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateAppointment} className="mt-4">
          <Form.Item
            name="title"
            label="Tiêu đề cuộc hẹn"
            rules={[{ required: true, message: 'Vui lòng nhập tiêu đề!' }]}
          >
            <Input placeholder="Ví dụ: Ký hợp đồng / Xem phòng thực tế" />
          </Form.Item>

          {/* Trong Modal tạo lịch hẹn */}
          <Form.Item
            name="roomId"
            label="Chọn phòng thực tế"
            rules={[{ required: true, message: 'Vui lòng chọn phòng!' }]}
          >
            <Select
              placeholder="Chọn phòng từ danh sách quản lý..."
              showSearch
              optionFilterProp="children"
            >
              {rooms.map(room => (
                <Select.Option key={room.id} value={room.id}>
                  {/* Backend dùng getTitle() nên ở đây dùng room.title */}
                  {room.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateTime"
            label="Thời gian dự kiến (Bắt đầu - Kết thúc)"
            rules={[{ required: true, message: 'Vui lòng chọn thời gian!' }]}
          >
            <DatePicker.RangePicker showTime format="DD/MM/YYYY HH:mm" className="w-full" />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <TextArea rows={3} placeholder="Nội dung nhắc nhở khách hàng..." />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ChatPage;
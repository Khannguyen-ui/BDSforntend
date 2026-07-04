import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Layout,
  Avatar,
  Input,
  Button,
  Spin,
  Typography,
  Empty,
  message,
  Tooltip,
  Upload,
  Image,
  Dropdown,
  Modal,
  DatePicker,
  Form,
  Select,
} from "antd";
import {
  SendOutlined,
  UserOutlined,
  SearchOutlined,
  MoreOutlined,
  CheckCircleFilled,
  PictureOutlined,
  CalendarOutlined,
  MessageOutlined,
  SmileOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

import useAuth from "../../hooks/useAuth";
import chatService from "../../services/chatService";
import uploadService from "../../services/uploadService";
import roomService from "../../services/roomService";
import appointmentService from "../../services/appointmentService";
import { useSocket } from "../../contexts/SocketContext";
import axiosClient from "../../config/axiosClient";

const { Sider, Content } = Layout;
const { Text } = Typography;
const { TextArea } = Input;

const REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

const ChatPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const {
    isConnected,
    lastMessage,
    sendChatMessage,
    sendTypingEvent,
    lastTypingEvent,
  } = useSocket();

  const [conversations, setConversations] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [rooms, setRooms] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittingAppointment, setSubmittingAppointment] = useState(false);

  const [typingPartner, setTypingPartner] = useState(false);
  const [partnerPresence, setPartnerPresence] = useState({
    online: false,
    lastSeen: "",
  });

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const getAccessTokenFromStorage = () => {
    const sessionKey = Object.keys(sessionStorage).find(
      (key) => key.endsWith("_accessToken") || key === "accessToken"
    );

    if (sessionKey) return sessionStorage.getItem(sessionKey);

    return localStorage.getItem("accessToken");
  };

  const getUserIdFromToken = () => {
    try {
      const token = getAccessTokenFromStorage();
      if (!token) return null;

      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return null;

      const payload = JSON.parse(atob(payloadBase64));
      return payload.userId || payload.id || payload.sub || null;
    } catch (error) {
      console.warn("Không đọc được userId từ JWT:", error);
      return null;
    }
  };

  const tokenUserId = getUserIdFromToken();
  const currentUserId = tokenUserId || user?.userId || user?.id || user?.sub;

  const getPartnerId = (item) => {
    if (!item) return null;
    return item.partnerId || item.userId || item.id;
  };

  const fetchConversations = async () => {
    try {
      const res = await chatService.getConversations();
      const rawList = res.data || [];

      const enriched = await Promise.all(
        rawList.map(async (conv) => {
          const partnerId = getPartnerId(conv);

          const needsEnrich =
            !conv.fullName ||
            conv.fullName === `User ${partnerId}` ||
            !conv.avatar;

          if (needsEnrich && partnerId) {
            try {
              const summaryRes = await axiosClient.get(
                `/customers/${partnerId}/summary`
              );
              const summary = summaryRes.data?.result || summaryRes.data;

              return {
                ...conv,
                fullName: summary?.fullName || conv.fullName,
                avatar: summary?.avatarUrl || conv.avatar,
              };
            } catch (err) {
              console.error(
                "LOAD_CUSTOMER_SUMMARY_FAILED",
                partnerId,
                err.response?.status,
                err.response?.data
              );
              return conv;
            }
          }

          return conv;
        })
      );

      setConversations(enriched);
    } catch (error) {
      console.error("fetchConversations error:", error);
      setConversations([]);
    }
  };

  const fetchRooms = async () => {
    if (!currentUserId) return;

    try {
      const res = await roomService.getMyRooms(currentUserId);
      setRooms(res.data || []);
    } catch (error) {
      console.error(
        "Không thể tải danh sách phòng:",
        error?.response?.data || error.message
      );
    }
  };

  useEffect(() => {
    if (lastMessage) handleIncomingMessage(lastMessage);
  }, [lastMessage, selectedPartner, currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchRooms();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    chatService.markOnline?.(currentUserId).catch(() => {});

    const handleBeforeUnload = () => {
      chatService.markOffline?.(currentUserId).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      chatService.markOffline?.(currentUserId).catch(() => {});
    };
  }, [currentUserId]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const userIdParam = searchParams.get("userId");
    const openPartnerId = location.state?.openPartnerId || userIdParam;

    if (!openPartnerId || conversations.length === 0) return;

    const partner = conversations.find((c) => {
      const pid = getPartnerId(c);
      return String(pid) === String(openPartnerId);
    });

    if (partner) {
      setSelectedPartner(partner);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [
    conversations,
    location.state,
    location.search,
    navigate,
    location.pathname,
  ]);

  useEffect(() => {
    if (!selectedPartner) return;

    const targetId = getPartnerId(selectedPartner);
    if (!targetId) return;

    setLoadingHistory(true);

    chatService
      .getChatHistory(targetId)
      .then((res) => setMessages(res.data || res || []))
      .catch((err) => console.error(err))
      .finally(() => setLoadingHistory(false));

    chatService
      .markAsRead(targetId)
      .then(() => fetchConversations())
      .catch((err) => console.error("Lỗi đánh dấu đã đọc:", err));
  }, [selectedPartner]);

  useEffect(() => {
    const targetId = getPartnerId(selectedPartner);
    if (!targetId) return;

    const fetchPresence = async () => {
      try {
        const res = await chatService.getPresence?.(targetId);
        setPartnerPresence(res?.data || {});
      } catch (err) {
        console.error("LOAD_PRESENCE_FAILED", err);
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 15000);

    return () => clearInterval(interval);
  }, [selectedPartner]);

  useEffect(() => {
    if (!lastTypingEvent || !selectedPartner) return;

    const targetId = getPartnerId(selectedPartner);

    if (String(lastTypingEvent.senderId) === String(targetId)) {
      setTypingPartner(true);

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingPartner(false);
      }, 1200);
    }
  }, [lastTypingEvent, selectedPartner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingPartner]);

  const filteredConversations = conversations.filter((item) =>
    item.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIncomingMessage = (msg) => {
    const targetId = getPartnerId(selectedPartner);

    if (!targetId || !currentUserId) {
      fetchConversations();
      return;
    }

    const isCurrentChat =
      (String(msg.senderId) === String(currentUserId) &&
        String(msg.receiverId) === String(targetId)) ||
      (String(msg.senderId) === String(targetId) &&
        String(msg.receiverId) === String(currentUserId)) ||
      (!msg.receiverId && String(msg.senderId) === String(targetId));

    if (isCurrentChat) {
      setMessages((prev) => {
        if (msg.id && prev.some((m) => m.id === msg.id)) {
          return prev.map((m) => (m.id === msg.id ? msg : m));
        }

        return [...prev, msg];
      });
    }

    fetchConversations();
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    const targetId = getPartnerId(selectedPartner);
    if (!targetId || !currentUserId) return;

    if (typeof sendTypingEvent === "function") {
      sendTypingEvent({
        senderId: currentUserId,
        receiverId: targetId,
        typing: true,
      });
    }
  };

  const handleSend = async () => {
    const targetId = getPartnerId(selectedPartner);
    if (!inputText.trim() || !targetId) return;

    const textToSend = inputText.trim();
    setInputText("");

    const optimisticMsg = {
      tempId: `temp-${Date.now()}`,
      senderId: currentUserId,
      receiverId: targetId,
      content: textToSend,
      type: "TEXT",
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await chatService.sendMessage({
        receiverId: targetId,
        content: textToSend,
        type: "TEXT",
      });

      const savedMsg = res.data;

      setMessages((prev) =>
        prev.map((m) => (m.tempId === optimisticMsg.tempId ? savedMsg : m))
      );
    } catch (error) {
      console.error("Gửi tin nhắn thất bại:", error);
      message.error("Không thể gửi tin nhắn. Vui lòng thử lại!");

      setMessages((prev) =>
        prev.filter((m) => m.tempId !== optimisticMsg.tempId)
      );
      setInputText(textToSend);
    }
  };

  const handleImageUpload = async (info) => {
    const file = info.file;
    const targetId = getPartnerId(selectedPartner);
    if (!targetId) return;

    try {
      message.loading({ content: "Đang gửi ảnh...", key: "upload_chat" });

      const imageUrl = await uploadService.uploadImage(file);

      const optimisticMsg = {
        tempId: `temp-${Date.now()}`,
        senderId: currentUserId,
        receiverId: targetId,
        content: imageUrl,
        type: "IMAGE",
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, optimisticMsg]);

      const res = await chatService.sendMessage({
        receiverId: targetId,
        content: imageUrl,
        type: "IMAGE",
      });

      const savedMsg = res.data;

      setMessages((prev) =>
        prev.map((m) => (m.tempId === optimisticMsg.tempId ? savedMsg : m))
      );

      message.success({ content: "Đã gửi ảnh", key: "upload_chat" });
    } catch (error) {
      console.error("UPLOAD_CHAT_FAILED", error);
      message.error({ content: "Lỗi gửi ảnh", key: "upload_chat" });
    }
  };

  const handleRecallMessage = async (messageId) => {
    if (!messageId) return;

    try {
      await chatService.recallMessage(messageId);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                isRecalled: true,
                content: "Tin nhắn đã được thu hồi",
              }
            : m
        )
      );

      message.success("Đã thu hồi tin nhắn");
    } catch (err) {
      console.error("RECALL_FAILED", err);
      message.error("Không thể thu hồi tin nhắn");
    }
  };

  const handleReactMessage = async (messageId, emoji) => {
    if (!messageId) return;

    try {
      const res = await chatService.reactMessage(messageId, emoji);
      const updatedMsg = res.data;

      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? updatedMsg : m))
      );
    } catch (err) {
      console.error("REACTION_FAILED", err);
      message.error("Không thể thả cảm xúc");
    }
  };

  const handleCreateAppointment = async (values) => {
    if (!selectedPartner) return;

    const targetId = getPartnerId(selectedPartner);
    if (!targetId) return;

    setSubmittingAppointment(true);

    try {
      const appointmentData = {
        propertyId: values.roomId,
        appointmentTime: values.dateTime[0].format("YYYY-MM-DDTHH:mm:ss"),
        note: values.note || "Khách muốn hẹn xem phòng",
      };

      const res = await appointmentService.create(appointmentData);

      if (res) {
        const selectedRoom = rooms.find((r) => r.id === values.roomId);
        const timeStr = values.dateTime[0].format("DD/MM/YYYY HH:mm");

        const chatContent = `📅 LỊCH HẸN HỆ THỐNG
📌 ${values.title}
📍 Phòng: ${selectedRoom?.title}
⏰ ${timeStr}
📝 ${values.note || "Không có ghi chú"}`;

        if (typeof sendChatMessage === "function") {
          sendChatMessage({
            senderId: currentUserId,
            receiverId: targetId,
            content: chatContent,
            type: "TEXT",
          });
        } else {
          await chatService.sendMessage({
            receiverId: targetId,
            content: chatContent,
            type: "TEXT",
          });
        }

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

  const menuItems = [
    {
      key: "appointment",
      label: "Tạo lịch hẹn hệ thống",
      icon: <CalendarOutlined />,
      onClick: () => setIsModalOpen(true),
    },
  ];

  const renderReactions = (msg, isMe) => {
    if (!msg.reactions) return null;

    const reactionValues = Array.isArray(msg.reactions)
      ? msg.reactions.map((r) => r.emoji || r)
      : Object.values(msg.reactions);

    if (reactionValues.length === 0) return null;

    return (
      <div
        className={`absolute -bottom-4 ${
          isMe ? "right-2" : "left-2"
        } bg-white/95 backdrop-blur border border-gray-100 rounded-full px-2.5 py-[2px] text-xs shadow-md`}
      >
        {reactionValues.join(" ")}
      </div>
    );
  };

  const renderMessageActions = (msg, isMe) => {
    const reactionItems = REACTIONS.map((emoji) => ({
      key: emoji,
      label: <span className="text-lg">{emoji}</span>,
      onClick: () => handleReactMessage(msg.id, emoji),
    }));

    return [
      {
        key: "reaction",
        label: (
          <Dropdown menu={{ items: reactionItems }} trigger={["click"]}>
            <span className="flex items-center gap-2">
              <SmileOutlined /> Thả cảm xúc
            </span>
          </Dropdown>
        ),
        disabled: !msg.id || msg.isRecalled,
      },
      ...(isMe && msg.id && !msg.isRecalled
        ? [
            {
              key: "recall",
              label: "Thu hồi tin nhắn",
              danger: true,
              onClick: () => handleRecallMessage(msg.id),
            },
          ]
        : []),
    ];
  };

  const renderMessage = (msg, index) => {
    const isMe =
      currentUserId && String(msg.senderId) === String(currentUserId);

    const isImage = msg.type === "IMAGE";
    const isCard = msg.type === "PROPERTY_CARD";

    if (isCard) {
      let card = null;

      try {
        card = JSON.parse(msg.content);
      } catch {
        card = null;
      }

      return (
        <div
          key={msg.id || msg.tempId || index}
          className={`flex w-full min-w-0 ${isMe ? "justify-end" : "justify-start"}`}
        >
          {!isMe && (
            <Avatar
              size={32}
              src={selectedPartner.avatar}
              icon={<UserOutlined />}
              className="mr-2 mt-auto shadow-sm"
            />
          )}

          <div
            onClick={() => card?.id && navigate(`/rooms/${card.id}`)}
            className="w-fit max-w-[min(310px,78%)] overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:-translate-y-[1px] transition-all"
          >
            {card?.image ? (
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-40 object-cover"
              />
            ) : (
              <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                Không có ảnh
              </div>
            )}

            <div className="p-3.5">
              <div className="font-semibold text-sm leading-snug mb-1 line-clamp-2 text-gray-800">
                {card?.title}
              </div>

              <div className="text-sm font-bold text-[#E03C31]">
                {card?.price?.toLocaleString("vi-VN")} đ/tháng
              </div>

              <div className="text-[12px] mt-1 truncate text-gray-500">
                📍 {card?.address}
              </div>

              <div className="text-[10px] mt-2 text-right text-gray-400">
                {dayjs(msg.createdAt).format("HH:mm")}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const actionItems = renderMessageActions(msg, isMe);

    return (
      <div
        key={msg.id || msg.tempId || index}
        className={`flex group w-full min-w-0 ${isMe ? "justify-end" : "justify-start"}`}
      >
        {!isMe && (
          <Avatar
            size={32}
            src={selectedPartner.avatar}
            icon={<UserOutlined />}
            className="mr-2 mt-auto shadow-sm"
          />
        )}

        <div className="relative min-w-0 max-w-[68%]">
          <Dropdown menu={{ items: actionItems }} trigger={["click"]}>
            <div
              className={`max-w-full overflow-hidden px-4 py-2.5 rounded-3xl text-sm shadow-sm relative whitespace-pre-wrap break-words cursor-pointer transition-all hover:shadow-md ${
                isMe
                  ? "bg-gradient-to-br from-[#E03C31] to-[#ff6b5f] text-white rounded-br-lg"
                  : "bg-white text-gray-800 rounded-bl-lg border border-gray-100"
              }`}
            >
              {msg.isRecalled ? (
                <i className={isMe ? "text-red-100" : "text-gray-400"}>
                  Tin nhắn đã được thu hồi
                </i>
              ) : isImage ? (
                <Image
                  src={msg.content}
                  className="rounded-2xl max-h-64 object-cover"
                />
              ) : (
                <span className="leading-relaxed break-words [overflow-wrap:anywhere]">{msg.content}</span>
              )}

              <div
                className={`text-[10px] mt-1.5 text-right ${
                  isMe ? "text-red-100" : "text-gray-400"
                }`}
              >
                {dayjs(msg.createdAt).format("HH:mm")}
                {isMe && <CheckCircleFilled className="ml-1 text-[10px]" />}
              </div>
            </div>
          </Dropdown>

          {renderReactions(msg, isMe)}
        </div>
      </div>
    );
  };

  return (
    <Layout className="h-[calc(100vh-88px)] m-4 w-full max-w-[1180px] overflow-hidden rounded-[28px] bg-white border border-gray-100 shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <Sider
        width={310}
        theme="light"
        className="border-r border-gray-100 bg-white flex flex-col h-full"
      >
        <div className="p-5 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xl font-bold text-gray-900">Tin nhắn</div>
              <div className="text-xs text-gray-400">
                {isConnected ? "Realtime đã kết nối" : "Đang mất kết nối"}
              </div>
            </div>

            <Tooltip title={isConnected ? "Đã kết nối" : "Mất kết nối"}>
              <div
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-emerald-500" : "bg-red-500"
                } shadow`}
              />
            </Tooltip>
          </div>

          <Input
            prefix={<SearchOutlined className="text-gray-400" />}
            placeholder="Tìm cuộc trò chuyện..."
            className="rounded-2xl h-11 border-none bg-gray-100 px-3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar bg-[#FAFBFD]">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400 text-xs text-center px-4">
              <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-3">
                <MessageOutlined style={{ fontSize: 26, opacity: 0.5 }} />
              </div>
              Chưa có cuộc trò chuyện nào
            </div>
          ) : (
            filteredConversations.map((item, idx) => {
              const itemId = getPartnerId(item);
              const targetId = getPartnerId(selectedPartner);
              const isActive =
                targetId && String(targetId) === String(itemId);
              const unread = item.unreadCount || 0;

              return (
                <div
                  key={itemId || idx}
                  onClick={() => setSelectedPartner(item)}
                  className={`flex items-center gap-3 p-3 mb-2 cursor-pointer rounded-2xl transition-all ${
                    isActive
                      ? "bg-white shadow-md border border-gray-100"
                      : "hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      size={48}
                      src={item.avatar}
                      icon={<UserOutlined />}
                      className="shadow-sm"
                    />

                    {unread > 0 && !isActive && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#E03C31] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <Text
                        strong={unread > 0 && !isActive}
                        className="truncate text-gray-900 block text-[14px]"
                      >
                        {item.fullName || "Người dùng"}
                      </Text>
                    </div>

                    <Text
                      className={`text-[12px] truncate block mt-0.5 ${
                        unread > 0 && !isActive
                          ? "text-gray-800 font-semibold"
                          : "text-gray-400"
                      }`}
                    >
                      {item.lastMessage || "Bắt đầu trò chuyện"}
                    </Text>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Sider>

      <Content className="flex min-w-0 flex-col bg-gradient-to-br from-[#F8FAFC] via-[#F5F7FB] to-[#EEF2FF]">
        {selectedPartner ? (
          <>
            <div className="h-[76px] px-6 bg-white/85 backdrop-blur border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar
                    size={46}
                    src={selectedPartner.avatar}
                    icon={<UserOutlined />}
                    className="shadow-sm"
                  />

                  {partnerPresence.online && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>

                <div>
                  <div className="font-bold text-gray-900 text-base">
                    {selectedPartner.fullName || "Người dùng"}
                  </div>

                  <div className="text-xs text-gray-400">
                    {partnerPresence.online
                      ? "Đang hoạt động"
                      : partnerPresence.lastSeen
                      ? `Hoạt động lần cuối: ${dayjs(
                          partnerPresence.lastSeen
                        ).format("DD/MM/YYYY HH:mm")}`
                      : "Không hoạt động"}
                  </div>
                </div>
              </div>

              <Dropdown
                menu={{ items: menuItems }}
                trigger={["click"]}
                placement="bottomRight"
              >
                <Button
                  icon={<MoreOutlined />}
                  type="text"
                  className="text-gray-500 rounded-full hover:bg-gray-100"
                />
              </Dropdown>
            </div>

            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-7 py-6 space-y-5 custom-scrollbar">
              {loadingHistory ? (
                <div className="text-center mt-8">
                  <Spin />
                </div>
              ) : messages.length === 0 ? (
                <Empty
                  description="Bắt đầu trò chuyện ngay!"
                  className="mt-16"
                />
              ) : (
                messages.map((msg, index) => renderMessage(msg, index))
              )}

              {typingPartner && (
                <div className="flex justify-start">
                  <Avatar
                    size={32}
                    src={selectedPartner.avatar}
                    icon={<UserOutlined />}
                    className="mr-2 shadow-sm"
                  />
                  <div className="bg-white border border-gray-100 px-4 py-2 rounded-3xl text-xs text-gray-400 shadow-sm">
                    Đang nhập...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-5 bg-white/90 backdrop-blur border-t border-gray-100">
              <div className="flex items-end gap-3 bg-gray-100 rounded-[24px] px-3 py-2">
                <Upload
                  customRequest={handleImageUpload}
                  showUploadList={false}
                  accept="image/*"
                >
                  <Button
                    icon={<PictureOutlined />}
                    type="text"
                    className="text-gray-500 hover:text-[#E03C31] rounded-full"
                  />
                </Upload>

                <Input.TextArea
                  value={inputText}
                  onChange={handleInputChange}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-transparent border-none shadow-none resize-none px-1 py-2 focus:shadow-none"
                />

                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  className="bg-[#E03C31] border-[#E03C31] shadow-md hover:scale-105 transition-transform"
                />
              </div>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <div className="w-24 h-24 rounded-[32px] bg-white shadow-lg flex items-center justify-center mb-5">
              <SendOutlined style={{ fontSize: 42, color: "#E03C31" }} />
            </div>

            {conversations.length === 0 ? (
              <>
                <Text className="text-xl text-gray-800 font-bold mb-2">
                  Bạn chưa có cuộc trò chuyện nào
                </Text>

                <Text className="text-sm text-gray-500 max-w-md mb-6">
                  Hãy truy cập trang chi tiết phòng trọ mà bạn quan tâm và chọn
                  nút{" "}
                  <strong className="text-[#E03C31]">
                    "Chat với chủ trọ"
                  </strong>{" "}
                  để bắt đầu trao đổi trực tiếp.
                </Text>

                <Button
                  type="primary"
                  size="large"
                  className="bg-[#E03C31] border-[#E03C31] rounded-full px-7 font-medium shadow-md"
                  onClick={() => navigate("/search")}
                >
                  Tìm phòng trọ ngay
                </Button>
              </>
            ) : (
              <>
                <Text className="text-xl text-gray-800 font-bold">
                  Chọn một cuộc hội thoại
                </Text>
                <Text className="text-sm text-gray-400 mt-1">
                  Tin nhắn sẽ hiển thị ở đây.
                </Text>
              </>
            )}
          </div>
        )}
      </Content>

      <Modal
        title={
          <div className="text-[#E03C31] font-semibold">
            <CalendarOutlined className="mr-2" /> Tạo lịch hẹn hệ thống
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submittingAppointment}
        okText="Xác nhận lưu lịch"
        cancelText="Hủy"
        okButtonProps={{
          className: "bg-[#E03C31] border-[#E03C31] rounded-lg",
        }}
        cancelButtonProps={{
          className: "rounded-lg",
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateAppointment}
          className="mt-4"
        >
          <Form.Item
            name="title"
            label="Tiêu đề cuộc hẹn"
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề!" }]}
          >
            <Input
              placeholder="Ví dụ: Ký hợp đồng / Xem phòng thực tế"
              className="rounded-xl"
            />
          </Form.Item>

          <Form.Item
            name="roomId"
            label="Chọn phòng thực tế"
            rules={[{ required: true, message: "Vui lòng chọn phòng!" }]}
          >
            <Select
              placeholder="Chọn phòng từ danh sách quản lý..."
              showSearch
              optionFilterProp="children"
              className="rounded-xl"
            >
              {rooms.map((room) => (
                <Select.Option key={room.id} value={room.id}>
                  {room.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dateTime"
            label="Thời gian dự kiến"
            rules={[{ required: true, message: "Vui lòng chọn thời gian!" }]}
          >
            <DatePicker.RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              className="w-full rounded-xl"
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <TextArea
              rows={3}
              placeholder="Nội dung nhắc nhở khách hàng..."
              className="rounded-xl"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ChatPage;
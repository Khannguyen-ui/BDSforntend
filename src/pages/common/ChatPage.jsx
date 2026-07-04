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

  const isProbablyPropertyJson = (content) => {
    if (!content || typeof content !== "string") return false;

    try {
      const parsed = JSON.parse(content);
      return (
        parsed &&
        typeof parsed === "object" &&
        (parsed.id || parsed.title || parsed.price || parsed.address)
      );
    } catch {
      return false;
    }
  };

  const parsePropertyCard = (content) => {
    try {
      return typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      return null;
    }
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
    if (lastMessage) {
      handleIncomingMessage(lastMessage);
    }
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

      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.tempId === optimisticMsg.tempId ? savedMsg : m))
        );
      }
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

      if (savedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.tempId === optimisticMsg.tempId ? savedMsg : m))
        );
      }

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

      if (updatedMsg) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? updatedMsg : m))
        );
      }
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

        await chatService.sendMessage({
          receiverId: targetId,
          content: chatContent,
          type: "TEXT",
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
        } bg-white border border-gray-100 rounded-full px-2 py-[1px] text-xs shadow-sm z-20`}
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

  return (
    <Layout className="h-[calc(100vh-80px)] bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm m-4">
      <Sider
        width={240}
        theme="light"
        className="border-r border-gray-200 flex flex-col h-full"
      >
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
            <div
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
          </Tooltip>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-xs text-center px-4">
              <MessageOutlined
                style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}
              />
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
                  className={`flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-blue-50 transition border-b border-gray-50 ${
                    isActive ? "bg-blue-50 border-r-4 border-r-blue-600" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar
                      size={40}
                      src={item.avatar}
                      icon={<UserOutlined />}
                    />

                    {unread > 0 && !isActive && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <Text
                      strong={unread > 0 && !isActive}
                      className="truncate text-gray-800 block text-[14px]"
                    >
                      {item.fullName || "Người dùng"}
                    </Text>

                    {item.lastMessage && (
                      <Text
                        className={`text-[11px] truncate block ${
                          unread > 0 && !isActive
                            ? "text-gray-700 font-semibold"
                            : "text-gray-400"
                        }`}
                      >
                        {item.lastMessage}
                      </Text>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Sider>

      <Content className="flex flex-col bg-[#F5F7FB]">
        {selectedPartner ? (
          <>
            <div className="h-16 px-6 bg-white border-b flex justify-between items-center shadow-sm z-10 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={selectedPartner.avatar}
                    icon={<UserOutlined />}
                  />

                  {partnerPresence.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-gray-800 text-base truncate">
                    {selectedPartner.fullName || "Người dùng"}
                  </div>

                  <div className="text-xs text-gray-400 truncate">
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
                  className="text-gray-500"
                />
              </Dropdown>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingHistory ? (
                <div className="text-center mt-4">
                  <Spin />
                </div>
              ) : messages.length === 0 ? (
                <Empty
                  description="Bắt đầu trò chuyện ngay!"
                  className="mt-10"
                />
              ) : (
                messages.map((msg, index) => {
                  const isMe =
                    currentUserId &&
                    String(msg.senderId) === String(currentUserId);

                  const isImage = msg.type === "IMAGE";
                  const isCard =
                    msg.type === "PROPERTY_CARD" ||
                    isProbablyPropertyJson(msg.content);

                  if (isCard && !isImage) {
                    const card = parsePropertyCard(msg.content);

                    return (
                      <div
                        key={msg.id || msg.tempId || index}
                        className={`flex ${
                          isMe ? "justify-end" : "justify-start"
                        }`}
                      >
                        {!isMe && (
                          <Avatar
                            size="small"
                            src={selectedPartner.avatar}
                            icon={<UserOutlined />}
                            className="mr-2 mt-auto mb-1"
                          />
                        )}

                        <div className="relative max-w-[280px]">
                          <Dropdown
                            menu={{
                              items: renderMessageActions(msg, isMe),
                            }}
                            trigger={["click"]}
                          >
                            <div
                              onClick={() =>
                                card?.id && navigate(`/rooms/${card.id}`)
                              }
                              className={`rounded-2xl overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow ${
                                isMe ? "rounded-br-none" : "rounded-bl-none"
                              }`}
                            >
                              {card?.image ? (
                                <img
                                  src={card.image}
                                  alt={card.title || "property"}
                                  className="w-full h-36 object-cover"
                                />
                              ) : (
                                <div className="w-full h-36 bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                                  Không có ảnh
                                </div>
                              )}

                              <div
                                className={`p-3 ${
                                  isMe ? "bg-[#E03C31]" : "bg-white border"
                                }`}
                              >
                                <div
                                  className={`font-bold text-sm leading-snug mb-1 line-clamp-2 ${
                                    isMe ? "text-white" : "text-gray-800"
                                  }`}
                                >
                                  {card?.title || "Tin bất động sản"}
                                </div>

                                <div
                                  className={`text-sm font-semibold ${
                                    isMe ? "text-red-100" : "text-[#E03C31]"
                                  }`}
                                >
                                  {Number(card?.price || 0).toLocaleString(
                                    "vi-VN"
                                  )}{" "}
                                  đ/tháng
                                </div>

                                <div
                                  className={`text-[11px] mt-1 truncate ${
                                    isMe ? "text-red-200" : "text-gray-500"
                                  }`}
                                >
                                  📍 {card?.address || "Chưa có địa chỉ"}
                                </div>

                                <div
                                  className={`text-[10px] mt-1 text-right ${
                                    isMe ? "text-red-200" : "text-gray-400"
                                  }`}
                                >
                                  {dayjs(msg.createdAt).format("HH:mm")}
                                  {isMe && (
                                    <CheckCircleFilled className="ml-1 text-[10px]" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </Dropdown>

                          {renderReactions(msg, isMe)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || msg.tempId || index}
                      className={`flex ${
                        isMe ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isMe && (
                        <Avatar
                          size="small"
                          src={selectedPartner.avatar}
                          icon={<UserOutlined />}
                          className="mr-2 mt-auto mb-1"
                        />
                      )}

                      <div className="relative max-w-[70%]">
                        <Dropdown
                          menu={{
                            items: renderMessageActions(msg, isMe),
                          }}
                          trigger={["click"]}
                        >
                          <div
                            className={`px-4 py-2 rounded-2xl text-sm shadow-sm relative whitespace-pre-wrap break-words [overflow-wrap:anywhere] cursor-pointer ${
                              isMe
                                ? "bg-[#E03C31] text-white rounded-br-none"
                                : "bg-white text-gray-800 rounded-bl-none border"
                            }`}
                          >
                            {msg.isRecalled ? (
                              <i
                                className={
                                  isMe ? "text-red-100" : "text-gray-400"
                                }
                              >
                                Tin nhắn đã được thu hồi
                              </i>
                            ) : isImage ? (
                              <Image
                                src={msg.content}
                                className="rounded-lg max-h-60 object-cover"
                              />
                            ) : (
                              <span className="break-words [overflow-wrap:anywhere]">
                                {msg.content}
                              </span>
                            )}

                            <div
                              className={`text-[10px] mt-1 text-right ${
                                isMe ? "text-red-100" : "text-gray-400"
                              }`}
                            >
                              {dayjs(msg.createdAt).format("HH:mm")}
                              {isMe && (
                                <CheckCircleFilled className="ml-1 text-[10px]" />
                              )}
                            </div>
                          </div>
                        </Dropdown>

                        {renderReactions(msg, isMe)}
                      </div>
                    </div>
                  );
                })
              )}

              {typingPartner && (
                <div className="flex justify-start">
                  <Avatar
                    size="small"
                    src={selectedPartner.avatar}
                    icon={<UserOutlined />}
                    className="mr-2 mt-auto mb-1"
                  />
                  <div className="bg-white border px-4 py-2 rounded-2xl rounded-bl-none text-xs text-gray-400 shadow-sm">
                    Đang nhập...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t flex items-center gap-2 flex-shrink-0">
              <Upload
                customRequest={handleImageUpload}
                showUploadList={false}
                accept="image/*"
              >
                <Button
                  icon={<PictureOutlined />}
                  type="text"
                  className="text-gray-500 hover:text-blue-500"
                />
              </Upload>

              <Input
                value={inputText}
                onChange={handleInputChange}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn..."
                className="rounded-full bg-gray-100 border-none h-10 px-4 flex-1"
              />

              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<SendOutlined />}
                onClick={handleSend}
                className="bg-[#E03C31] border-[#E03C31]"
              />
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
            <div className="bg-white p-6 rounded-full shadow-sm mb-4">
              <SendOutlined style={{ fontSize: 40, color: "#E03C31" }} />
            </div>

            {conversations.length === 0 ? (
              <>
                <Text className="text-lg text-gray-700 font-semibold mb-2">
                  Bạn chưa có cuộc trò chuyện nào
                </Text>

                <Text className="text-sm text-gray-500 max-w-md mb-6">
                  Hãy truy cập trang chi tiết phòng trọ mà bạn quan tâm và chọn
                  nút{" "}
                  <strong className="text-[#E03C31]">
                    "Chat với chủ trọ"
                  </strong>{" "}
                  để bắt đầu trao đổi trực tiếp!
                </Text>

                <Button
                  type="primary"
                  size="large"
                  className="bg-[#E03C31] border-[#E03C31] rounded-full px-6 font-medium"
                  onClick={() => navigate("/search")}
                >
                  Tìm phòng trọ ngay
                </Button>
              </>
            ) : (
              <Text className="text-lg">
                Chọn một cuộc hội thoại để bắt đầu
              </Text>
            )}
          </div>
        )}
      </Content>

      <Modal
        title={
          <div className="text-[#E03C31]">
            <CalendarOutlined className="mr-2" /> Tạo lịch hẹn hệ thống
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submittingAppointment}
        okText="Xác nhận lưu lịch"
        cancelText="Hủy"
        okButtonProps={{ className: "bg-[#E03C31] border-[#E03C31]" }}
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
            <Input placeholder="Ví dụ: Ký hợp đồng / Xem phòng thực tế" />
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
              className="w-full"
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm">
            <TextArea
              rows={3}
              placeholder="Nội dung nhắc nhở khách hàng..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default ChatPage;
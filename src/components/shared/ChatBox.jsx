import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import useAuth from "../../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../config/axiosClient";
import { useSocket } from "../../contexts/SocketContext";
import { message } from "antd";

const QUICK_REPLIES = [
  "Tìm phòng trọ dưới 3 triệu",
  "Phòng gần trung tâm Q1",
  "Phòng có gác lửng",
  "Căn hộ 2 phòng ngủ",
];

const createWelcomeMessage = () => ({
  role: "ai",
  text: "Chào bạn  Mình là **Smart Rental AI** — trợ lý tìm phòng thông minh của bạn!\n\nBạn đang tìm kiếm loại phòng gì? 🏠",
  time: new Date().toISOString(),
  items: [],
});

const BotAvatar = () => (
  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
    <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
      <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13c-.83 0-1.5.67-1.5 1.5S6.67 16 7.5 16 9 15.33 9 14.5 8.33 13 7.5 13m9 0c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5M12 22a10 10 0 0 1-10-10H2a10 10 0 0 0 10 10 10 10 0 0 0 10-10h-2A10 10 0 0 1 12 22z" />
    </svg>
  </div>
);

const TypingDots = () => (
  <div className="flex items-center gap-1 px-4 py-3 bg-white rounded-2xl rounded-tl-none shadow-sm border border-gray-100 w-fit">
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:0ms]" />
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:150ms]" />
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce [animation-delay:300ms]" />
  </div>
);

const formatTime = (date) => {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date instanceof Date ? date : new Date(date));
};

const PropertyCard = ({ item, onClick }) => (
  <div
    onClick={onClick}
    className="flex gap-2 p-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
  >
    {item.imageUrl ? (
      <img
        src={item.imageUrl}
        alt={item.title}
        className="w-14 h-14 object-cover rounded bg-gray-100"
        onError={(e) => {
          e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/8645/8645899.png";
        }}
      />
    ) : (
      <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </div>
    )}

    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-800 truncate block">
        {item.title || "Không có tiêu đề"}
      </p>
      <p className="text-xs text-green-600 font-bold mt-0.5">
        {item.price ? `${item.price.toLocaleString("vi-VN")}đ` : "Liên hệ"}
      </p>
      <p className="text-[10px] text-gray-500 truncate">
        {item.district || item.province || ""}
      </p>
    </div>
  </div>
);

export default function ChatBox() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const { user } = useAuth();
  const { aiMessage, resetAiMessage } = useSocket();
  const navigate = useNavigate();

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const aiTimeoutRef = useRef(null);

  const getConversationStorageKey = useCallback(() => {
    return user?.id ? `ai-conversation-id-${user.id}` : null;
  }, [user?.id]);

  const getMessagesStorageKey = useCallback(() => {
    return user?.id ? `chat-messages-${user.id}` : null;
  }, [user?.id]);

  const createConversationId = useCallback(() => {
    if (!user?.id) return null;

    return `user-${user.id}-conv-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setConversationId(null);
      setMessages([createWelcomeMessage()]);
      setShowQuickReplies(true);
      return;
    }

    const conversationKey = `ai-conversation-id-${user.id}`;
    const savedConversationId = localStorage.getItem(conversationKey);

    if (savedConversationId) {
      setConversationId(savedConversationId);
    } else {
      const newId = `user-${user.id}-conv-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      localStorage.setItem(conversationKey, newId);
      setConversationId(newId);
    }

    const messagesKey = `chat-messages-${user.id}`;
    const savedMessages = localStorage.getItem(messagesKey);

    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);

        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setShowQuickReplies(parsed.length <= 1);
          return;
        }
      } catch {
        localStorage.removeItem(messagesKey);
      }
    }

    setMessages([createWelcomeMessage()]);
    setShowQuickReplies(true);
  }, [user?.id]);

  useEffect(() => {
    const messagesKey = getMessagesStorageKey();

    if (!messagesKey) return;

    localStorage.setItem(messagesKey, JSON.stringify(messages));
  }, [messages, getMessagesStorageKey]);

  useEffect(() => {
    if (!open) return;

    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return;

    setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    if (!inputRef.current) return;

    inputRef.current.style.height = "auto";
    inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    if (!aiMessage) return;

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }

    if (aiMessage.conversationId) {
      setConversationId(aiMessage.conversationId);

      const conversationKey = getConversationStorageKey();
      if (conversationKey) {
        localStorage.setItem(conversationKey, aiMessage.conversationId);
      }
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "ai",
        text: aiMessage.aiReply || "Không nhận được phản hồi từ AI.",
        time: new Date().toISOString(),
        items: aiMessage.items || [],
        hasMore: aiMessage.hasMore || false,
      },
    ]);

    setLoading(false);
    resetAiMessage();
  }, [aiMessage, resetAiMessage, getConversationStorageKey]);

  useEffect(() => {
    return () => {
      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
        aiTimeoutRef.current = null;
      }
    };
  }, []);

  const requireLogin = useCallback(() => {
    if (user) return true;

    message.warning("Vui lòng đăng nhập để sử dụng trợ lý AI.");
    navigate("/login");
    return false;
  }, [user, navigate]);

  const sendMessage = useCallback(
    async (text) => {
      if (!requireLogin()) return;

      if (!conversationId) {
        message.warning("Đang khởi tạo cuộc trò chuyện, vui lòng thử lại.");
        return;
      }

      const msgText = (text || input).trim();
      if (!msgText || loading) return;

      setInput("");
      setShowQuickReplies(false);

      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: msgText,
          time: new Date().toISOString(),
          items: [],
        },
      ]);

      setLoading(true);

      if (aiTimeoutRef.current) {
        clearTimeout(aiTimeoutRef.current);
      }

      aiTimeoutRef.current = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "⏱️ Trợ lý AI đang xử lý hơi lâu. Vui lòng thử đặt câu hỏi khác hoặc gửi lại nhé.",
            time: new Date().toISOString(),
            items: [],
          },
        ]);

        setLoading(false);
        aiTimeoutRef.current = null;
      }, 25000);

      try {
        await axiosClient.post("/api/chat/test-ai-flow", {
          conversationId,
          userMessage: msgText,
        });
      } catch (error) {
        console.error("Lỗi gửi REST AI Flow:", error);

        if (aiTimeoutRef.current) {
          clearTimeout(aiTimeoutRef.current);
          aiTimeoutRef.current = null;
        }

        const status = error.response?.status;

        if (status === 401) {
          setMessages((prev) => [
            ...prev,
            {
              role: "ai",
              text: "🔐 Bạn cần đăng nhập để sử dụng trợ lý AI.",
              time: new Date().toISOString(),
              items: [],
            },
          ]);

          message.warning("Vui lòng đăng nhập để sử dụng trợ lý AI.");
          setLoading(false);
          navigate("/login");
          return;
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: "❌ Không thể gửi tin nhắn đến trợ lý AI. Vui lòng kiểm tra kết nối mạng và thử lại.",
            time: new Date().toISOString(),
            items: [],
          },
        ]);

        setLoading(false);
      }
    },
    [input, loading, conversationId, requireLogin, navigate]
  );

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lịch sử trò chuyện và bắt đầu lại?")) {
      return;
    }

    const messagesKey = getMessagesStorageKey();
    if (messagesKey) {
      localStorage.removeItem(messagesKey);
    }

    const conversationKey = getConversationStorageKey();
    if (conversationKey) {
      localStorage.removeItem(conversationKey);
    }

    const welcomeMessage = createWelcomeMessage();
    setMessages([welcomeMessage]);
    setShowQuickReplies(true);

    const newConversationId = createConversationId();

    if (newConversationId && conversationKey) {
      setConversationId(newConversationId);
      localStorage.setItem(conversationKey, newConversationId);
    }
  };

  const handleOpen = () => {
    if (!requireLogin()) return;
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);

    if (aiTimeoutRef.current) {
      clearTimeout(aiTimeoutRef.current);
      aiTimeoutRef.current = null;
    }
  };

  return (
    <>
      {!open && (
        <div
          className="fixed z-[99999]"
          style={{ bottom: "28px", right: "28px" }}
        >
          <button
            onClick={handleOpen}
            className="group relative flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.18)] border-2 border-green-500 hover:scale-110 transition-all duration-300 focus:outline-none"
            aria-label="Mở trợ lý AI"
          >
            <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-25 animate-ping" />
            <img
              src="https://fpt.ai/static/v3/images/icon-bot.png"
              alt="AI Bot"
              className="w-11 h-11 relative z-10"
              onError={(e) => {
                e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4712/4712035.png";
              }}
            />
            <span className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              Trợ lý AI
              <span className="absolute left-full top-1/2 -translate-y-1/2 border-4 border-transparent border-l-gray-900" />
            </span>
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed z-[100000] flex flex-col bg-white rounded-2xl overflow-hidden"
          style={{
            bottom: "28px",
            right: "28px",
            width: "320px",
            height: "480px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.22)",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-emerald-700 to-green-500 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                <img
                  src="https://fpt.ai/static/v3/images/icon-bot.png"
                  className="w-6 h-6"
                  alt="bot"
                  onError={(e) => {
                    e.currentTarget.src = "https://cdn-icons-png.flaticon.com/512/4712/4712035.png";
                  }}
                />
              </div>
              <div>
                <p className="font-bold text-white text-sm leading-none">
                  Smart Rental AI
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
                  <p className="text-[11px] text-white/80">Đang trực tuyến</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearHistory}
                title="Xóa lịch sử trò chuyện"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>

              <button
                onClick={handleClose}
                title="Đóng ChatBox"
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/80 to-white">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "ai" && <BotAvatar />}

                <div className="flex flex-col max-w-[82%]">
                  {msg.role === "ai" && (
                    <div className="px-4 py-2.5 rounded-2xl rounded-tl-none text-[13px] leading-relaxed shadow-sm bg-white text-gray-800 border border-gray-100 break-words">
                      <ReactMarkdown
                        components={{
                          img: ({ node, ...props }) => (
                            <img {...props} className="rounded-lg my-2 max-w-full h-auto shadow-sm" alt="property" />
                          ),
                          a: ({ node, ...props }) => (
                            <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-500 font-semibold underline hover:text-blue-700" />
                          ),
                          p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>

                      {msg.items && msg.items.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 mt-3">
                          {msg.items.slice(0, 3).map((item) => (
                            <PropertyCard
                              key={item.propertyId}
                              item={item}
                              onClick={() => navigate(`/rooms/${item.propertyId}`)}
                            />
                          ))}

                          {msg.hasMore && (
                            <div className="text-center mt-1 pt-1 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setOpen(false);
                                  navigate("/search");
                                }}
                                className="text-xs text-green-600 hover:text-emerald-700 font-bold transition-colors inline-flex items-center gap-1 focus:outline-none"
                              >
                                Xem thêm kết quả trọ khác ➔
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {msg.role === "user" && (
                    <div
                      className="px-4 py-2.5 rounded-2xl rounded-tr-none text-[13px] leading-relaxed shadow-sm bg-gradient-to-br from-green-500 to-emerald-600 text-white break-words overflow-hidden"
                      style={{ wordBreak: "break-word" }}
                    >
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="mb-1 last:mb-0" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  )}

                  {msg.time && (
                    <span
                      className={`text-[10px] mt-0.5 text-gray-400 ${
                        msg.role === "user" ? "text-right" : "text-left ml-1"
                      }`}
                    >
                      {formatTime(msg.time)}
                    </span>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                    {user?.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="you"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <BotAvatar />
                <TypingDots />
              </div>
            )}

            {showQuickReplies && !loading && (
              <div className="pt-1">
                <p className="text-[10px] text-gray-400 mb-2 ml-9 uppercase tracking-wide">
                  Gợi ý
                </p>
                <div className="flex flex-wrap gap-2 ml-9">
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr}
                      onClick={() => sendMessage(qr)}
                      className="text-xs px-3 py-1.5 rounded-full border border-green-300 text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-400 transition-all duration-200 font-medium"
                    >
                      {qr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2 focus-within:border-green-400 focus-within:bg-white transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi của bạn..."
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent text-sm resize-none outline-none text-gray-800 placeholder-gray-400 max-h-[82px] py-1.5 leading-relaxed disabled:opacity-50 overflow-y-auto"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>

            <p className="text-center text-[9px] text-gray-400 mt-2 uppercase tracking-widest">
              Powered by SmartRental AI
            </p>
          </div>
        </div>
      )}
    </>
  );
}
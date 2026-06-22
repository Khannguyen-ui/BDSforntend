import axiosClient from "../config/axiosClient";

const chatService = {
  // 1. Lấy danh sách những người đã từng chat (Sidebar trái)
  getConversations: () => {
    return axiosClient.get("/api/chat/conversations");
  },

  // 2. Lấy lịch sử tin nhắn với một người (Main Chat)
  getChatHistory: (partnerId) => {
    return axiosClient.get(`/api/chat/history/${partnerId}`);
  },

  // 3. Gửi tin nhắn
  sendMessage: (receiverId, content, type = "TEXT") => {
    return axiosClient.post("/api/chat/send", {
      receiverId: receiverId,
      content: content,
      type: type 
    });
  },

  // 4. Bắt đầu cuộc trò chuyện mới
  startConversation: (partnerId) => {
    return axiosClient.post("/api/chat/start", { partnerId });
  },

  // 5. Đánh dấu đã đọc
  markAsRead: (partnerId) => {
    return axiosClient.put(`/api/chat/read/${partnerId}`);
  }
};

export default chatService;
import axiosClient from "../config/axiosClient";

const chatService = {
  getConversations: () => axiosClient.get("/api/chat/conversations"),

  getChatHistory: (partnerId) =>
    axiosClient.get(`/api/chat/history/${partnerId}`),

  sendMessage: ({
    receiverId,
    content = "",
    type = "TEXT",
    mediaUrl = null,
    replyToMessageId = null,
  }) => {
    return axiosClient.post("/api/chat/send", {
      receiverId,
      content,
      type,
      mediaUrl,
      replyToMessageId,
    });
  },

  startConversation: (partnerId) =>
    axiosClient.post("/api/chat/start", { partnerId }),

  markAsRead: (partnerId) =>
    axiosClient.put(`/api/chat/read/${partnerId}`),

  recallMessage: (messageId) =>
    axiosClient.put(`/api/chat/recall/${messageId}`),

  reactMessage: (messageId, emoji) =>
    axiosClient.post("/api/chat/reaction", {
      messageId,
      emoji,
    }),

  markOnline: (userId) =>
    axiosClient.post(
      "/api/chat/presence/online",
      {},
      { headers: { "X-User-Id": userId } }
    ),

  markOffline: (userId) =>
    axiosClient.post(
      "/api/chat/presence/offline",
      {},
      { headers: { "X-User-Id": userId } }
    ),

  getPresence: (userId) =>
    axiosClient.get(`/api/chat/presence/${userId}`),
};

export default chatService;
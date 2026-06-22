import axiosClient from "../config/axiosClient";

const notificationService = {
  // 1. Lấy danh sách thông báo
  getMyNotifications: () => {
    return axiosClient.get('/api/notifications');
  },
  getUnreadNotifications: (page = 0, size = 10) => {
    return axiosClient.get('/api/notifications/unread', { params: { page, size } });
  },
  // 2. Đánh dấu đã đọc
  markAsRead: (id) => {
    return axiosClient.put(`/api/notifications/${id}/read`);
  },

  // 3. Lấy số lượng thông báo chưa đọc
  getUnreadCount: () => {
    return axiosClient.get('/api/notifications/unread-count');
  },

  // 4. Đánh dấu tất cả đã đọc
  markAllAsRead: () => {
    return axiosClient.put('/api/notifications/read-all');
  }
};

export default notificationService;
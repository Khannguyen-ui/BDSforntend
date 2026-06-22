import axiosClient from "../config/axiosClient";
import { getGuestId } from "../utils/guestId";

const commentService = {
  getComments: async (propertyId, page = 0, size = 10) => {
    return axiosClient.get(`/properties/comments/${propertyId}`, {
      params: { page, size }
    });
  },

  getReplies: async (parentId, page = 0, size = 10) => {
    return axiosClient.get(`/properties/comments/replies/${parentId}`, {
      params: { page, size }
    });
  },

  createComment: async (data) => {
    // data = { propertyId, parentId, replyToUserId, content }
    const userSessionId = sessionStorage.getItem('userSessionId');
    const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;
    const userId = userSessionId ? sessionStorage.getItem(`${userSessionId}_userId`) : null;

    const headers = {};
    const guestId = getGuestId();
    
    headers['X-Guest-Id'] = guestId;
    if (userId) {
      headers['X-User-Id'] = userId;
      data.userId = userId;
    }
    data.guestId = guestId;
    
    return axiosClient.post('/properties/comments', data, { headers });
  },

  deleteComment: async (commentId) => {
    return axiosClient.delete(`/properties/comments/${commentId}`);
  },

  countComments: async (propertyId) => {
    return axiosClient.get(`/properties/comments/count/${propertyId}`);
  }
};

export default commentService;

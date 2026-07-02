import axiosClient from "../config/axiosClient";

const reviewService = {
  getRoomReviews: (roomId) => {
    return axiosClient.get(`/reviews/room/${roomId}`);
  },

  createOwnerReview: (data) => {
    return axiosClient.post("/owners/reviews", data);
  },

  replyReview: (reviewId, replyContent) => {
    return axiosClient.put(`/reviews/${reviewId}/reply`, {
      reply: replyContent,
    });
  },

  getOwnerReviews: (ownerId) => {
    return axiosClient.get(`/owners/reviews/${ownerId}`);
  },

  getOwnerReviewSummary: (ownerId) => {
    return axiosClient.get(`/owners/reviews/${ownerId}/summary`);
  },

  replyOwnerReview: (reviewId, replyContent) => {
    return axiosClient.post(`/owners/reviews/${reviewId}/reply`, {
      reply: replyContent,
    });
  },
};

export default reviewService;
import axiosClient from "../config/axiosClient";

const reviewService = {
  getRoomReviews: (roomId) => {
    return axiosClient.get(`/reviews/room/${roomId}`);
  },

  createReview: (data) => {
    return axiosClient.post("/reviews", data);
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

  createOwnerReview: (reviewerId, data) => {
    return axiosClient.post("/owners/reviews", data, {
      headers: {
        "X-User-Id": reviewerId,
      },
    });
  },

  replyOwnerReview: (ownerId, reviewId, replyContent) => {
    return axiosClient.post(
      `/owners/reviews/${reviewId}/reply`,
      { reply: replyContent },
      {
        headers: {
          "X-User-Id": ownerId,
        },
      }
    );
  },
};

export default reviewService;
import axiosClient from "../config/axiosClient";

const reviewService = {
    // Gọi đến @GetMapping("/room/{roomId}") trong ReviewController
    getRoomReviews: (roomId) => {
        return axiosClient.get(`/reviews/room/${roomId}`);
    },

    // Gọi đến @PostMapping
    createReview: (data) => {
        return axiosClient.post('/reviews', data);
    },

    // Gọi đến @PutMapping("/{id}/reply") cho chủ trọ
    replyReview: (reviewId, replyContent) => {
        return axiosClient.put(`/reviews/${reviewId}/reply`, { reply: replyContent });
    }
};

export default reviewService;
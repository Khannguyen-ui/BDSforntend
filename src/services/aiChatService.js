import axiosClient from "../config/axiosClient";

export const askAI = async (question) => {
  try {
    // Sử dụng API thật
    const response = await axiosClient.post('/api/chat/ai', { question });
    return response.data?.answer || response.data?.result || response.data;
  } catch (error) {
    console.error("Lỗi AI Service:", error.response?.data || error.message);
    throw error;
  }
};
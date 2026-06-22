import axiosClient from "../config/axiosClient";

const uploadService = {
  // Upload 1 file và trả về URL
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    
    // Gọi API: POST /media/api/v1/media/upload
    const response = await axiosClient.post("/media/api/v1/media/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    // Phụ thuộc vào cấu trúc trả về, thử lấy url hoặc data.url
    return response.data.url || response.data.result?.url || response.data; 
  },

  // Upload nhiều file cùng lúc
  uploadMultiple: async (files) => {
    const formData = new FormData();
    files.forEach(f => formData.append("files", f));
    
    // Gọi API: POST /media/api/v1/media/upload-multiple
    const response = await axiosClient.post("/media/api/v1/media/upload-multiple", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data.urls || response.data.result; 
  }
};

export default uploadService;
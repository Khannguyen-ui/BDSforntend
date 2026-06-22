import axiosClient from "../config/axiosClient";

const customerservice = {
  // ============================
  // 1. THÔNG TIN CÁ NHÂN (PROFILE)
  // ============================
  // Lấy thông tin chính mình
  getProfile: () => {
    return axiosClient.get('/customers/profile');
  },

  // Cập nhật thông tin chính mình
  updateProfile: (data) => {
    return axiosClient.put('/customers/profile', data);
  },

  // Nâng cấp tài khoản lên chủ trọ
  upgradeToLandlord: () => {
    return axiosClient.post('/customers/upgrade');
  },

  // Upload Ảnh bìa (Banner)
  uploadBanner: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/customers/banner', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Lấy tóm tắt thông tin User
  getUserSummary: (id) => {
    return axiosClient.get(`/customers/${id}/summary`);
  },

  // ============================
  // 2. XÁC MINH DANH TÍNH (KYC)
  // ============================
  // Upload file ảnh (Lên Cloudinary)
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axiosClient.post('/media/api/v1/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Trích xuất thông tin CCCD (OCR/FPT.AI)
  extractIdCard: (file) => {
    const formData = new FormData();
    formData.append('image', file);
    return axiosClient.post('/customers/kyc/scan', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Gửi hồ sơ KYC để chờ duyệt
  submitKyc: (kycToken, citizenId, fullName, address, frontFile, backFile) => {
    const formData = new FormData();
    formData.append('kycToken', kycToken);
    formData.append('citizenId', citizenId);
    formData.append('fullName', fullName);
    formData.append('address', address);
    formData.append('frontImage', frontFile);
    formData.append('backImage', backFile);

    return axiosClient.post('/customers/kyc', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  // ============================
  // 3. CÔNG KHAI (PUBLIC)
  // ============================
  // Lấy danh sách chủ trọ tiêu biểu
  // Temporary mock implementation: endpoint not available in backend
  getTopLandlords: async () => {
    // Return empty list to prevent errors
    return Promise.resolve({ data: [] });
  },
  getLandlordPublicProfile: (slug) => {
    return axiosClient.get(`/customers/${slug}/public-profile`);
  },
  getLandlordPublicBanner: (slug) => {
    return axiosClient.get(`/customers/${slug}/public-banner`);
  },


  getLandlordRooms: (id) => {
    return axiosClient.get(`/rooms/landlord/${id}`);
  },
};

export default customerservice;
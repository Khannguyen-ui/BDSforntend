import axiosClient from "../config/axiosClient";

const paymentService = {
  // 1. Lấy thông tin Profile (để lấy walletBalance)
  // Backend: GET /customers/profile
  getMyWallet: () => {
    return axiosClient.get('/customers/profile');
  },

  // 2. Lấy lịch sử giao dịch theo userId
  // Backend: GET /api/transactions/my-history/{userId}
  getMyHistory: (userId) => {
    return axiosClient.get(`/api/transactions/my-history/${userId}`);
  },

  // 3. Tạo link thanh toán VNPay
  // Backend: POST /api/payment/create-payment?amount=xxx&userId=yyy
  createPaymentUrl: (amount, userId) => {
    return axiosClient.post(`/api/payment/create-payment`, null, {
      params: { amount, userId }
    });
  },

  // 4. Mua gói hội viên
  buyMembership: (packageId) => {
    // Bắt buộc dùng tham số thứ 2 là null (Body rỗng) 
    // và nhét packageId vào tham số thứ 3 (Config Params)
    return axiosClient.post('/api/packages/buy-membership', null, {
      params: {
        packageId: packageId
      }
    });
  },

  buyPromotion: (packageId, propertyId) => {
    return axiosClient.post('/api/packages/buy-promotion', null, {
      params: {
        packageId: packageId,
        propertyId: propertyId
      }
    });
  }
};

export default paymentService;
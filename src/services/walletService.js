import axiosClient from "../config/axiosClient";

const walletService = {
  // 1. Lấy số dư ví hiện tại
  getMyWallet: () => axiosClient.get('/api/wallets/me'),

  // 2. Lấy lịch sử giao dịch (Phân trang)
  getMyTransactions: (page = 0, size = 10) => {
    return axiosClient.get('/api/wallets/transactions', {
      params: { page, size }
    });
  }
};

export default walletService;

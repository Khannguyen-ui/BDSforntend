import axiosClient from "../config/axiosClient";

const authService = {
  login: (email, password) => {
    return axiosClient.post('/auth/login', { email, password });
  },

  // Hàm đăng ký
  register: (data) => {
    // Backend yêu cầu: fullName, email, password, phone, role
    return axiosClient.post('/auth/register', data);
  },

  // 🟢 Gửi yêu cầu quên mật khẩu (nhận vào email)
  forgotPassword: (email) => {
    return axiosClient.post('/auth/forgot-password', { email });
  },

  // 🟢 Đặt lại mật khẩu mới
  resetPassword: (data) => {
    // data truyền vào từ ResetPassword.jsx bao gồm: { token, newPassword }
    return axiosClient.post('/auth/reset-password', data);
  },
  changePassword: (data) => {
    return axiosClient.post('/auth/change-password', {
      oldPassword: data.oldPassword,
      newPassword: data.newPassword
    });
  },

  // Báo cho Backend biết để tống Token hiện tại vào Blacklist (Redis)
  logout: () => {
    return axiosClient.post('/auth/logout');
  },
  
  // Yêu cầu Đổi Email
  changeEmail: (password, newEmail) => {
    return axiosClient.put('/auth/change-email', { password, newEmail });
  },

  // Xin cấp lại token mới khi token cũ hết hạn
  refreshToken: (oldToken) => {
    return axiosClient.post('/auth/refresh', null, {
      headers: {
        Authorization: `Bearer ${oldToken}`
      }
    });
  }

};

export default authService;
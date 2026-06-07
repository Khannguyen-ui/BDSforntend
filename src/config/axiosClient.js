import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn token
axiosClient.interceptors.request.use((config) => {
  // 1. Ưu tiên Admin session
  const adminSessionId = sessionStorage.getItem('adminSessionId');
  let token = null;

  if (adminSessionId) {
    token = sessionStorage.getItem(`${adminSessionId}_accessToken`);
  }

  // 2. Fallback về User session
  if (!token) {
    const userSessionId = sessionStorage.getItem('userSessionId');
    if (userSessionId) {
      token = sessionStorage.getItem(`${userSessionId}_accessToken`);
    }
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Xử lý X-Guest-Id cho khách vãng lai khi CHƯA đăng nhập
    let guestId = localStorage.getItem('guestId');
    if (!guestId || isNaN(guestId)) {
      // Sử dụng ID dạng số nguyên lớn (Date.now()) để tránh lỗi 400 Bad Request khi backend expect Long
      guestId = Date.now().toString();
      localStorage.setItem('guestId', guestId);
    }
    config.headers['X-Guest-Id'] = guestId;
  }

  return config;
});

// Bắt lỗi 401 tự động để Refresh Token
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Chỉ thực hiện refresh token khi có lỗi 401 (Hết hạn) và chưa retry bao giờ
    axiosClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const url = originalRequest.url || '';

        const isAuthPublicEndpoint =
          url.includes('/auth/login') ||
          url.includes('/auth/register') ||
          url.includes('/auth/forgot-password') ||
          url.includes('/auth/reset-password') ||
          url.includes('/auth/refresh');

        if (status === 401 && isAuthPublicEndpoint) {
          return Promise.reject(error);
        }

        if (status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const adminSessionId = sessionStorage.getItem('adminSessionId');
          const userSessionId = sessionStorage.getItem('userSessionId');

          const oldToken =
            (adminSessionId && sessionStorage.getItem(`${adminSessionId}_accessToken`)) ||
            (userSessionId && sessionStorage.getItem(`${userSessionId}_accessToken`));

          if (!oldToken) {
            sessionStorage.clear();
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            return Promise.reject(error);
          }

          try {
            const res = await axios.post('/auth/refresh', null, {
              headers: {
                Authorization: `Bearer ${oldToken}`
              }
            });

            const newToken = res.data?.result?.token;

            if (!newToken) {
              throw new Error('Không nhận được token mới');
            }

            if (adminSessionId) {
              sessionStorage.setItem(`${adminSessionId}_accessToken`, newToken);
            } else if (userSessionId) {
              sessionStorage.setItem(`${userSessionId}_accessToken`, newToken);
            }

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosClient(originalRequest);
          } catch (refreshError) {
            sessionStorage.clear();
            localStorage.removeItem('token');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return Promise.reject(error);
  }
);

export default axiosClient;

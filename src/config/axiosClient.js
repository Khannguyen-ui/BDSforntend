import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCurrentToken = () => {
  const userSessionId = sessionStorage.getItem('userSessionId');

  if (userSessionId) {
    const userToken = sessionStorage.getItem(`${userSessionId}_accessToken`);
    if (userToken) {
      return {
        token: userToken,
        sessionId: userSessionId,
        sessionType: 'user',
      };
    }
  }

  const adminSessionId = sessionStorage.getItem('adminSessionId');

  if (adminSessionId) {
    const adminToken = sessionStorage.getItem(`${adminSessionId}_accessToken`);
    if (adminToken) {
      return {
        token: adminToken,
        sessionId: adminSessionId,
        sessionType: 'admin',
      };
    }
  }

  return null;
};

const clearAuthStorage = () => {
  const guestId = localStorage.getItem('guestId');

  sessionStorage.clear();

  localStorage.removeItem('user');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
  localStorage.removeItem('role');

  if (guestId) {
    localStorage.setItem('guestId', guestId);
  }
};

const isAuthPublicEndpoint = (url = '') => {
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/refresh')
  );
};

axiosClient.interceptors.request.use((config) => {
  const currentAuth = getCurrentToken();

  if (currentAuth?.token) {
    config.headers.Authorization = `Bearer ${currentAuth.token}`;
  } else {
    let guestId = localStorage.getItem('guestId');

    if (!guestId || isNaN(guestId)) {
      guestId = Date.now().toString();
      localStorage.setItem('guestId', guestId);
    }

    config.headers['X-Guest-Id'] = guestId;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url || '';

    if (status === 401 && isAuthPublicEndpoint(url)) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const currentAuth = getCurrentToken();

      if (!currentAuth?.token) {
        clearAuthStorage();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post('/auth/refresh', null, {
          headers: {
            Authorization: `Bearer ${currentAuth.token}`,
          },
        });

        const newToken = res.data?.result?.token;

        if (!newToken) {
          throw new Error('Không nhận được token mới');
        }

        if (currentAuth.sessionType === 'admin') {
          sessionStorage.setItem(`${currentAuth.sessionId}_accessToken`, newToken);
        } else {
          sessionStorage.setItem(`${currentAuth.sessionId}_accessToken`, newToken);
        }

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      } catch (refreshError) {
        clearAuthStorage();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
import React, { createContext, useState, useEffect } from 'react';
import axiosClient from '../config/axiosClient';
import userService from '../services/userService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ SESSION ID CHO USER
  const getSessionId = () => {
    let sessionId = sessionStorage.getItem('userSessionId');
    if (!sessionId) {
      sessionId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      sessionStorage.setItem('userSessionId', sessionId);
    }
    return sessionId;
  };

  const sessionId = getSessionId();

  const getSessionItem = (key) => sessionStorage.getItem(`${sessionId}_${key}`);
  const setSessionItem = (key, value) => sessionStorage.setItem(`${sessionId}_${key}`, value);
  const clearSession = () => {
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(`${sessionId}_`)) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const logout = async () => {
    try {
      const token = getSessionItem('accessToken');
      if (token) {
        await authService.logout();
      }
    } catch (e) {
      console.warn("Lỗi khi gọi API Đăng xuất (Backend):", e);
    } finally {
      clearSession();
      setUser(null);
      window.location.href = '/';
    }
  };

  const refreshProfile = async () => {
    const token = getSessionItem('accessToken');
    if (!token) {
      setLoading(false);
      return;
    };

    try {
      const res = await userService.getProfile();
      const profileData = res.data?.result || res.data.result;

      
      const finalRole = profileData.role || getSessionItem('role');

      if (profileData) {
        setSessionItem('role', finalRole);
        setSessionItem('fullName', profileData.fullName);
        setSessionItem('userId', profileData.id);
        setSessionItem('email', profileData.email);
        setSessionItem('citizenId', profileData.citizenId || '');
        setSessionItem('kycStatus', profileData.kycStatus || '');
        setSessionItem('phone', profileData.phone || '');
        setSessionItem('avatarUrl', profileData.avatarUrl || '');
      }

      setUser({
        ...profileData,
        role: finalRole
      });
    } catch (error) {
      console.warn('Profile API fail, use sessionStorage fallback');
      const fallbackUser = {
        id: getSessionItem('userId'),
        fullName: getSessionItem('fullName'),
        email: getSessionItem('email'),
        role: getSessionItem('role'),
        avatarUrl: getSessionItem('avatarUrl') || null,
        citizenId: getSessionItem('citizenId') || null,
        kycStatus: getSessionItem('kycStatus') || null,
        phone: getSessionItem('phone') || null
      };
      setUser(fallbackUser);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkLogin = async () => {
      await refreshProfile();
      setLoading(false); // ✅ BẮT BUỘC: Kết thúc loading
    };
    checkLogin();
  }, []);
  const login = async (email, password) => {
    try {
      const cleanEmail = email.trim();
      const res = await axiosClient.post('/auth/login', {
        email: cleanEmail,
        password: password
      });
      const data = res.data.result;

      // ✅ LƯU VÀO SESSION STORAGE
      setSessionItem('accessToken', data.token);
      setSessionItem('role', data.role);
      setSessionItem('fullName', data.fullName);
      setSessionItem('userId', data.id);
      setSessionItem('email', data.email);

      // Gọi refreshProfile để lấy toàn bộ dữ liệu profile (bao gồm citizenId, kycStatus, ...)
      await refreshProfile();
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      const errorMsg = error.response?.data?.message || "Lỗi đăng nhập";
      return { success: false, message: errorMsg };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
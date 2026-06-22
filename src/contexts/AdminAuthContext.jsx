import React, { createContext, useState, useEffect } from 'react';
import axiosClient from '../config/axiosClient'; // ✅ DÙNG chung axiosClient
import userService from '../services/userService';

export const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
    const [adminUser, setAdminUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const getAdminSessionId = () => {
        let sessionId = sessionStorage.getItem('adminSessionId');
        if (!sessionId) {
            sessionId = 'admin_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('adminSessionId', sessionId);
        }
        return sessionId;
    };

    const sessionId = getAdminSessionId();

    const getAdminSessionItem = (key) => sessionStorage.getItem(`${sessionId}_${key}`);
    const setAdminSessionItem = (key, value) => sessionStorage.setItem(`${sessionId}_${key}`, value);
    const clearAdminSession = () => {
        Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith(`${sessionId}_`)) {
                sessionStorage.removeItem(key);
            }
        });
    };

    const logout = () => {
        clearAdminSession();
        setAdminUser(null);
    };

    const refreshAdminProfile = async () => {
        const token = getAdminSessionItem('accessToken');
        if (!token) {
            setLoading(false);
            return;
        }

        // ✅ KHÔNG GỌI API profile (tránh 403)
        // Dùng session fallback luôn
        const fallbackUser = {
            id: getAdminSessionItem('userId'),
            fullName: getAdminSessionItem('fullName'),
            email: getAdminSessionItem('email'),
            role: getAdminSessionItem('role')
        };

        //console.log('[AdminAuth refresh]', fallbackUser);
        setAdminUser(fallbackUser);
        setLoading(false); // ✅ QUAN TRỌNG
    };

    // useEffect đơn giản
    useEffect(() => {
        const checkAdminLogin = () => {
            const adminSessionId = getAdminSessionId();
            const token = getAdminSessionItem('accessToken');

            //console.log('[AdminAuth] Session check:', { adminSessionId, token });

            if (token) {
                // 🔥 LOAD USER TỪ SESSION NGAY LẬP TỨC
                const userData = {
                    id: getAdminSessionItem('userId'),
                    fullName: getAdminSessionItem('fullName'),
                    email: getAdminSessionItem('email'),
                    role: getAdminSessionItem('role') // 🔥 QUAN TRỌNG
                };
                //console.log('[AdminAuth] Set user:', userData);
                setAdminUser(userData);
            }

            // 🔥 SET LOADING FALSE NGAY
            setLoading(false);
        };
        checkAdminLogin();
        refreshAdminProfile();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axiosClient.post('/auth/login', { email: email.trim(), password });
            const data = res.data.result;

            setAdminSessionItem('accessToken', data.token);
            setAdminSessionItem('role', data.role);
            setAdminSessionItem('fullName', data.fullName);
            setAdminSessionItem('userId', data.id);
            setAdminSessionItem('email', data.email);

            setAdminUser({
                id: data.id,
                fullName: data.fullName,
                email: data.email,
                role: data.role
            });

            await refreshAdminProfile();
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || "Lỗi đăng nhập" };
        }
    };

    return (
        <AdminAuthContext.Provider value={{
            adminUser,
            login,      // ✅ Tên thống nhất
            logout,
            loading,
            refreshProfile: refreshAdminProfile
        }}>
            {children}
        </AdminAuthContext.Provider>
    );
};
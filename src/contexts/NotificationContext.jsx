import React, { createContext, useContext, useState, useEffect } from 'react';
import { App } from 'antd';
import notificationService from '../services/notificationService';
import useAuth from '../hooks/useAuth';
import { useSocket } from './SocketContext';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { user } = useAuth();
    const { notification: antdNotification } = App.useApp();
    const { lastMessage } = useSocket();
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const response = await notificationService.getUnreadCount();
            const count = response.data?.result !== undefined ? response.data.result : response.data || 0;
            setUnreadCount(count);
        } catch (error) {
            console.error("Lỗi lấy số lượng thông báo:", error);
        }
    };

    // Lắng nghe tin nhắn mới qua WebSocket
    useEffect(() => {
        if (lastMessage && user) {
            const pathname = window.location.pathname;

            // 1. Phân biệt: Nếu là tin nhắn Chat (có receiverId)
            if (lastMessage.receiverId && lastMessage.receiverId === user.id) {
                const isChatPage = pathname.includes('/messages') || pathname.includes('/landlord/customer-management');
                
                // Nếu không ở trang Chat, hiện Toast Popup
                if (!isChatPage) {
                    antdNotification.info({
                        message: 'Có tin nhắn mới',
                        description: lastMessage.type === 'IMAGE' ? '[Hình ảnh]' : lastMessage.content,
                        placement: 'bottomRight',
                        style: { cursor: 'pointer' },
                        onClick: () => {
                            // Chuyển hướng người dùng sang trang tin nhắn kèm theo userId của người gửi
                            window.location.href = `/messages?userId=${lastMessage.senderId}`;
                        }
                    });
                    
                    fetchUnreadCount();
                }
            } 
            // 2. Nếu là Thông báo Hệ thống (thường có title, message, hoặc type không phải TEXT/IMAGE)
            else if (lastMessage.title || lastMessage.message || ['SYSTEM', 'PAYMENT', 'PROPERTY', 'KYC_STATUS', 'ROOM_PUSH_SUCCESS', 'ROOM_EXPIRING', 'SERVICE_BOOKED', 'APPOINTMENT_SUGGESTION'].includes(lastMessage.type)) {
                antdNotification.info({
                    message: lastMessage.title || 'Thông báo mới',
                    description: lastMessage.message || '',
                    placement: 'bottomRight',
                    style: { cursor: 'pointer' },
                    onClick: () => {
                        window.location.href = `/notifications`;
                    }
                });
                
                // Tăng số đếm chưa đọc lên 1
                setUnreadCount(prev => prev + 1);
            }
        }
    }, [lastMessage, user, antdNotification]);

    const decrementUnreadCount = () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const markAllAsReadContext = () => {
        setUnreadCount(0);
    };

    useEffect(() => {
        if (user) {
            fetchUnreadCount();
        } else {
            setUnreadCount(0);
        }
    }, [user]);

    return (
        <NotificationContext.Provider value={{
            unreadCount,
            fetchUnreadCount,
            decrementUnreadCount,
            markAllAsReadContext
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => useContext(NotificationContext);
export default NotificationContext;

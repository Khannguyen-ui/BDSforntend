import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

import Stomp from 'stompjs';
import useAuth from '../hooks/useAuth';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState(null);
    const [aiMessage, setAiMessage] = useState(null);
    const stompClientRef = useRef(null);

    useEffect(() => {
        if (!user?.id) return;
        let isMounted = true;

        // Cấu hình Socket sử dụng WebSockets thuần (Bypass lỗi 500 của SockJS /info)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws-chat`;
        const socket = new WebSocket(wsUrl);
        const stompClient = Stomp.over(socket);

        // Tắt log debug của STOMP để đỡ rác console
        stompClient.debug = () => { };
        // Lấy token xác thực từ sessionStorage để vượt qua WebSocketAuthInterceptor ở Backend
        const userSessionId = sessionStorage.getItem('userSessionId');
        const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        stompClient.connect(headers, () => {
            if (isMounted && stompClient.connected) {
                setIsConnected(true);

                // Lắng nghe kênh P2P Chat của user bằng nhiều định danh để tránh sót tin
                const p2pTopics = [`/topic/user/${user.id}`];
                if (user.email) p2pTopics.push(`/topic/user/${user.email}`);

                [...new Set(p2pTopics)].forEach((topic) => {
                    stompClient.subscribe(topic, (payload) => {
                        if (isMounted) {
                            const newMessage = JSON.parse(payload.body);
                            setLastMessage(newMessage);
                        }
                    });
                });

                // Lắng nghe kênh AI Chat của user bằng cả Numerical ID và Email (userId dạng Principal của Spring Security)
                const aiTopics = [`/topic/user/${user.id}/ai`];
                if (user.email) {
                    aiTopics.push(`/topic/user/${user.email}/ai`);
                    aiTopics.push(`/topic/user/${user.email.toLowerCase()}/ai`);
                }

                [...new Set(aiTopics)].forEach((topic) => {
                    //console.log("🔌 [WebSocket] Đang đăng ký lắng nghe AI topic:", topic);
                    stompClient.subscribe(topic, (payload) => {
                        if (isMounted) {
                            const aiMsg = JSON.parse(payload.body);
                            //console.log("📥 [WebSocket] Nhận tin nhắn từ topic:", topic, aiMsg);
                            setAiMessage(aiMsg);
                        }
                    });
                });
            }
        }, (err) => {
            if (isMounted) setIsConnected(false);
            //console.error("Lỗi kết nối Socket:", err);
        });

        stompClientRef.current = stompClient;

        return () => {
            isMounted = false;
            if (stompClientRef.current?.connected) {
                stompClientRef.current.disconnect();
            }
        };
    }, [user]);

    // Hàm gửi tin nhắn P2P
    const sendChatMessage = (messageDTO) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            const userSessionId = sessionStorage.getItem('userSessionId');
            const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            stompClientRef.current.send("/app/chat", headers, JSON.stringify(messageDTO));
            return true;
        }
        return false;
    };

    // Hàm gửi tin nhắn AI
    const sendAiMessage = (aiRequest) => {
        if (stompClientRef.current && stompClientRef.current.connected) {
            const userSessionId = sessionStorage.getItem('userSessionId');
            const token = userSessionId ? sessionStorage.getItem(`${userSessionId}_accessToken`) : null;
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            stompClientRef.current.send("/app/ai-chat", headers, JSON.stringify(aiRequest));
            return true;
        }
        return false;
    };

    return (
        <SocketContext.Provider value={{
            isConnected,
            lastMessage,
            aiMessage,
            sendChatMessage,
            sendAiMessage,
            resetAiMessage: () => setAiMessage(null),
        }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => useContext(SocketContext);
export default SocketContext;

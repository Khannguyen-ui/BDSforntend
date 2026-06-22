// src/hooks/useChatSocket.js
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';

const useChatSocket = (currentUser) => {
    const stompClientRef = useRef(null);
    const [incomingMessage, setIncomingMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!currentUser?.id) return;

        const socket = new SockJS(import.meta.env.VITE_API_URL + '/ws');

        const client = Stomp.over(socket);
        client.debug = () => {}; // Tắt log

        client.connect({}, () => {
            setIsConnected(true);
            // Subscribe kênh riêng của user
            client.subscribe(`/topic/user/${currentUser.id}`, (payload) => {
                const msg = JSON.parse(payload.body);
                setIncomingMessage(msg);
            });
        }, (err) => {
            console.error("Socket error:", err);
            setIsConnected(false);
        });

        stompClientRef.current = client;

        return () => {
            if (client.connected) client.disconnect();
        };
    }, [currentUser]);

    const sendMessage = (receiverId, content) => {
        if (stompClientRef.current && isConnected) {
            const chatMessage = {
                senderId: currentUser.id,
                receiverId: receiverId,
                content: content,
                type: 'TEXT'
            };
            stompClientRef.current.send("/app/chat", {}, JSON.stringify(chatMessage));
            return true;
        }
        return false;
    };

    return { isConnected, sendMessage, incomingMessage };
};

export default useChatSocket;
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import Stomp from "stompjs";
import useAuth from "../hooks/useAuth";

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [aiMessage, setAiMessage] = useState(null);
  const [lastTypingEvent, setLastTypingEvent] = useState(null);

  const stompClientRef = useRef(null);

  const getTokenHeaders = () => {
    const userSessionId = sessionStorage.getItem("userSessionId");
    const token = userSessionId
      ? sessionStorage.getItem(`${userSessionId}_accessToken`)
      : sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");

    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!user?.id) return;

    let isMounted = true;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws-chat`;

    const socket = new WebSocket(wsUrl);
    const stompClient = Stomp.over(socket);

    stompClient.debug = () => {};

    const headers = getTokenHeaders();

    stompClient.connect(
      headers,
      () => {
        if (!isMounted || !stompClient.connected) return;

        setIsConnected(true);

        const p2pTopics = [`/topic/user/${user.id}`];

        if (user.email) {
          p2pTopics.push(`/topic/user/${user.email}`);
        }

        [...new Set(p2pTopics)].forEach((topic) => {
          stompClient.subscribe(topic, (payload) => {
            if (!isMounted) return;

            const newMessage = JSON.parse(payload.body);
            setLastMessage(newMessage);
          });
        });

        const typingQueues = [`/user/${user.id}/queue/typing`, `/queue/typing`];

        if (user.email) {
          typingQueues.push(`/user/${user.email}/queue/typing`);
        }

        [...new Set(typingQueues)].forEach((topic) => {
          stompClient.subscribe(topic, (payload) => {
            if (!isMounted) return;

            const typingEvent = JSON.parse(payload.body);
            setLastTypingEvent(typingEvent);
          });
        });

        const aiTopics = [`/topic/user/${user.id}/ai`];

        if (user.email) {
          aiTopics.push(`/topic/user/${user.email}/ai`);
          aiTopics.push(`/topic/user/${user.email.toLowerCase()}/ai`);
        }

        [...new Set(aiTopics)].forEach((topic) => {
          stompClient.subscribe(topic, (payload) => {
            if (!isMounted) return;

            const aiMsg = JSON.parse(payload.body);
            setAiMessage(aiMsg);
          });
        });
      },
      () => {
        if (isMounted) setIsConnected(false);
      }
    );

    stompClientRef.current = stompClient;

    return () => {
      isMounted = false;
      setIsConnected(false);

      if (stompClientRef.current?.connected) {
        stompClientRef.current.disconnect();
      }
    };
  }, [user?.id, user?.email]);

  const sendChatMessage = (messageDTO) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.send(
        "/app/chat",
        getTokenHeaders(),
        JSON.stringify(messageDTO)
      );
      return true;
    }

    return false;
  };

  const sendTypingEvent = (typingEvent) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.send(
        "/app/chat.typing",
        getTokenHeaders(),
        JSON.stringify(typingEvent)
      );
      return true;
    }

    return false;
  };

  const sendAiMessage = (aiRequest) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.send(
        "/app/ai-chat",
        getTokenHeaders(),
        JSON.stringify(aiRequest)
      );
      return true;
    }

    return false;
  };

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        lastMessage,
        aiMessage,
        lastTypingEvent,
        sendChatMessage,
        sendTypingEvent,
        sendAiMessage,
        resetAiMessage: () => setAiMessage(null),
        resetLastMessage: () => setLastMessage(null),
        resetTypingEvent: () => setLastTypingEvent(null),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
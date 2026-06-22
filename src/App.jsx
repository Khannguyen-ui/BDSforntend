// src/App.jsx
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd'; // Import thêm AntApp
import AppRoutes from './routes/AppRoutes';
import ChatBox from './components/shared/ChatBox';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#ea580c' } }}> {/* Thêm nếu bạn muốn chỉnh màu cam thương hiệu */}
      <AntApp>
        <AuthProvider>
          <AdminAuthProvider>
            <SocketProvider>
              <NotificationProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <ChatBox />
                </BrowserRouter>
              </NotificationProvider>
            </SocketProvider>
          </AdminAuthProvider>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
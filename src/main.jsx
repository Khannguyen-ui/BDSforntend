import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { App as AntdApp } from 'antd'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AntdApp>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AntdApp>
  </React.StrictMode>,
)
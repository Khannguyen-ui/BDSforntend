import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import http from 'http'

export default defineConfig(({ command }) => {
  if (command === 'serve') {
    try {
      const redirectServer = http.createServer((req, res) => {
        res.writeHead(302, { Location: `http://localhost:5173${req.url}` });
        res.end();
      });
      redirectServer.on('error', () => { });
      redirectServer.listen(3000);
    } catch (e) { }
  }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/auth': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          secure: false
        },
        '/oauth2': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          secure: false
        },
        '/customers': {
          target: 'http://127.0.0.1:8082',
          changeOrigin: true,
          secure: false,
        },
        '/media': {
          target: 'http://127.0.0.1:8084',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/media/, ''),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(' PROXY HIT:', req.method, req.url, '→', proxyReq.path);
            });
            proxy.on('error', (err, req, res) => {
              console.log(' PROXY ERROR:', err);
            });
          }
        },
        '/api/notifications': 'http://127.0.0.1:8085',
        '/ws-notifier': {
          target: 'http://127.0.0.1:8085',
          ws: true
        },
        '/properties': 'http://127.0.0.1:8086',
        '/owners': 'http://127.0.0.1:8086',
        '/amenities': 'http://127.0.0.1:8086',
        '/admin/master-data/amenities': 'http://127.0.0.1:8086',
        '/admin/master-data/packages': 'http://127.0.0.1:8080',
        '/admin/projects': 'http://127.0.0.1:8086',
        '/admin/properties': 'http://127.0.0.1:8086',
        '/admin/amenities': 'http://127.0.0.1:8086',
        '/public/projects': {
          target: 'http://127.0.0.1:8086',
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) return '/index.html';
          }
        },
        '/public/properties': {
          target: 'http://127.0.0.1:8086',
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) return '/index.html';
          }
        },
        '/appointments': {
          target: 'http://127.0.0.1:8086',
          changeOrigin: true,
          bypass: (req) => {
            if (req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) return '/index.html';
          }
        },

        //Payment
        '/api/payment': {
          target: 'http://127.0.0.1:8087',
          changeOrigin: false,
          secure: false,
          headers: {
            'Origin': 'http://localhost:3000'
          },
          configure: (proxy, options) => {
            proxy.on('proxyRes', (proxyRes, req, res) => {
            
              if (proxyRes.statusCode === 302 && proxyRes.headers['location']) {
                proxyRes.headers['location'] = proxyRes.headers['location'].replace('http://localhost:3000', 'http://localhost:5173');
              }
            });
          }
        },
        '/api/transactions': {
          target: 'http://127.0.0.1:8087',
          changeOrigin: true,
          secure: false,
        },
        '/api/packages': {
          target: 'http://127.0.0.1:8087',
          changeOrigin: true,
          secure: false,
          headers: {
            'Origin': 'http://127.0.0.1:8087' 
          }
        },
       
        '/api/admin/packages': {
          target: 'http://127.0.0.1:8087',
          changeOrigin: true,
          secure: false,
          headers: {
            'Origin': 'http://127.0.0.1:8087'
          }
        },
        '/api/bills': {
          target: 'http://127.0.0.1:8087',
          changeOrigin: true,
          secure: false,
        },
        // --- Search Service ---
        '/search/': {
          target: 'http://127.0.0.1:8088', 
          changeOrigin: true,
          secure: false,
        },
        '/recommend': {
          target: 'http://127.0.0.1:8092',
          changeOrigin: true,
          secure: false,
        },
        '/api/v1/analytics': {
          target: 'http://127.0.0.1:8088', 
          changeOrigin: true,
          secure: false,
        },
        '/api/wallets': {
          target: 'http://127.0.0.1:8089',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(' WALLET PROXY:', req.method, req.url);
            });
          }
        },
        '/api/chat': {
          target: 'http://127.0.0.1:8090',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log(' CHAT REST PROXY:', req.method, req.url);
            });
          }
        },
        '/ws-chat': {
          target: 'http://127.0.0.1:8090',
          ws: true,
          changeOrigin: true,
          configure: (proxy, options) => {
            proxy.on('upgrade', (proxySocket, socket, head) => {
              console.log('🔌 CHAT WEBSOCKET CONNECTED');
            });
            proxy.on('error', (err) => {
              console.log('❌ CHAT WS ERROR:', err);
            });
          }
        },
       
        '/admin/users': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          secure: false,
          bypass: (req, res, options) => {
            // Chỉ bypass nếu là navigation HTML (React Router), KHÔNG bypass Axios API calls
            if (req.headers.accept?.includes('text/html') && !req.headers['x-requested-with']) {
              return '/index.html';
            }
          }
        },
        '/admin': {
          target: 'http://127.0.0.1:8081',
          changeOrigin: true,
          bypass: (req, res, options) => {
            if (req.headers.accept?.includes('text/html')) {
              return '/index.html';
            }
          }
        },
      }
    }
  }
})




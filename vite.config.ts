import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  return {
    plugins: [react(), tailwindcss()],
    
    // Define environment variables
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    
    // Path aliases
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    
    // Server configuration - THIS FIXES THE 404
    server: {
      port: 5173, // Frontend port
      open: true, // Auto-open browser
      proxy: {
        // Proxy all /api requests to backend
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path, // Keep path as is
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying:', req.method, req.url);
            });
          },
        },
      },
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    
    // Build configuration
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
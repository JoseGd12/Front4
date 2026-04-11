
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          export: ['xlsx', 'jspdf'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tooltip', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://barberiaapi-em5q.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            console.error('[proxy error]', req.method, req.url, err?.message || err);
          });
          proxy.on('proxyReq', (_proxyReq, req) => {
            console.info('[proxy request]', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.info('[proxy response]', req.method, req.url, proxyRes.statusCode);
          });
        },
      },
      '/assets': {
        target: 'https://barberiaapi-em5q.onrender.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
      '/instagram-api': {
        target: 'https://graph.facebook.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/instagram-api/, ''),
      },
    }
  },
});

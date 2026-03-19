
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
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'https://manitobarbershop.up.railway.app',
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
        target: 'https://manitobarbershop.up.railway.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      }
    }
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': { target: 'http://localhost:5000', changeOrigin: true },
      '/session': { target: 'http://localhost:5000', changeOrigin: true },
      '/attendance': { target: 'http://localhost:5000', changeOrigin: true },
      '/user': { target: 'http://localhost:5000', changeOrigin: true },
      '/health': { target: 'http://localhost:5000', changeOrigin: true },
    },
  },
});

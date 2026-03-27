import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    react(),
    basicSsl(), // Tự động tạo chứng chỉ https cho dev server
  ],
  server: {
    host: true, // Lắng nghe trên 0.0.0.0 (để điện thoại trong cùng WiFi có thể truy cập)
    port: 5174, // Dùng port khác với mfe-client (5173)
    https: true as any, // Bắt buộc bật HTTPS
    strictPort: true,
    proxy: {
      '/socket.io': {
        target: 'http://192.168.1.4:3000', // Đẩy ngầm về NestJS
        ws: true,
      },
    },
  },
});

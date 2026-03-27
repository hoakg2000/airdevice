import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    // Tắt hoàn toàn việc băm tên file (hashing), luôn xuất ra 1 tên cố định
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        format: 'iife',
        entryFileNames: 'air-device.js',
        name: 'AirDeviceMFE', // Global variable cho script
      },
    },
    // Không tách file CSS, chuẩn bị cho việc inject thẳng vào Shadow DOM
    cssCodeSplit: false,
    // Ép mọi asset (SVG, PNG) nhỏ hơn 100MB thành Base64 nhúng thẳng vào JS
    assetsInlineLimit: 100000000,
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

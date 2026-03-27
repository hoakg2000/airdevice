import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Sửa lại thành arrow function để nhận biến 'mode'
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  
  // Các cấu hình build xịn xò của bạn giữ nguyên
  build: {
    target: 'esnext',
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        format: 'iife',
        entryFileNames: 'air-device.js',
        name: 'AirDeviceMFE',
      },
    },
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
  
  // FIX Ở ĐÂY: Chỉ ép production khi KHÔNG phải là chế độ test
  define: {
    'process.env.NODE_ENV': mode === 'test' ? '"development"' : '"production"',
  },
  
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  },
}));
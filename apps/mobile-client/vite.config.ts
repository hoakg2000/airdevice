import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    // Relative asset paths: the signaling server serves this build under /m/
    base: './',
    plugins: [
      react(),
      basicSsl(), // getUserMedia needs HTTPS on phones
    ],
    server: {
      host: true, // reachable from a phone on the same Wi-Fi
      port: 5174,
      strictPort: true,
      proxy: {
        '/socket.io': {
          target: env.VITE_SIGNALING_URL || 'http://localhost:3000',
          ws: true,
        },
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});

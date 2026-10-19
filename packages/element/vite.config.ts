import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// `vite build`            -> dist/index.js (ESM, dependencies external, for bundlers)
// `vite build --mode cdn` -> dist/air-device.iife.js (everything bundled, for a <script> tag)
export default defineConfig(({ mode }) => {
  const cdn = mode === 'cdn';
  const external = [...Object.keys(pkg.dependencies), ...Object.keys(pkg.peerDependencies)];

  return {
    plugins: [react()],
    // Only the self-contained CDN bundle needs React's production flag baked in
    define: cdn ? { 'process.env.NODE_ENV': '"production"' } : {},
    build: {
      target: 'es2020',
      emptyOutDir: !cdn,
      lib: {
        entry: 'src/index.ts',
        name: 'AirDevice',
        formats: cdn ? ['iife'] : ['es'],
        fileName: () => (cdn ? 'air-device.iife.js' : 'index.js'),
      },
      rollupOptions: {
        external: cdn ? [] : (id) => external.some((dep) => id === dep || id.startsWith(`${dep}/`)),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.ts',
    },
  };
});

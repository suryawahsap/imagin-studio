import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
    watch: process.env.DISABLE_HMR === 'true' ? null : {
      ignored: ['**/server.ts', '**/download_service.ts', '**/engine_service.py', '**/vector_service.ts', '**/storage/**'],
    },
    fs: { allow: [__dirname, path.resolve(__dirname, 'storage')] },
  },
});

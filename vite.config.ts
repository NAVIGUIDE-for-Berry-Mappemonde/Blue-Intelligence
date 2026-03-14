import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    build: {
      target: 'es2020',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true'
        ? { port: process.env.HMR_PORT ? parseInt(process.env.HMR_PORT, 10) : 0 }
        : false,
      allowedHosts: ['.trycloudflare.com', '.ngrok-free.dev', '.ngrok.io'],
      watch: {
        ignored: ['**/data/**', '**/blue_intelligence.db', '**/*.db'],
      },
    },
  }
);

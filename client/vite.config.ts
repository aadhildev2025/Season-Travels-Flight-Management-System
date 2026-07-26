import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/tmv2/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://127.0.0.1:5000',
    },
  },
});

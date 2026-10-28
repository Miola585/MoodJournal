import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  cacheDir: process.env.PLAYWRIGHT_TEST ? 'node_modules/.vite-playwright' : undefined
});

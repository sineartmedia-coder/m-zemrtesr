import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Plain Vite SPA config – no Cloudflare/Vinext plugins
// Used by Vercel to build a fully static bundle
export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist-vercel',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Make sure app imports resolve correctly
      '@': '/app',
    },
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Recursively copy a folder
function copyDir(src: string, dest: string) {
  mkdirSync(dest, { recursive: true });
  for (const item of readdirSync(src)) {
    const s = join(src, item), d = join(dest, item);
    try {
      statSync(s).isDirectory() ? copyDir(s, d) : copyFileSync(s, d);
    } catch (e) { /* skip missing */ }
  }
}

// Plain Vite SPA config – no Cloudflare/Vinext plugins
// Used by Vercel to build a fully static bundle
export default defineConfig({
  plugins: [
    react(),
    {
      // After build, copy the museum images folder into the output directory
      name: 'copy-museum-assets',
      closeBundle() {
        try {
          copyDir('museum', 'dist-vercel/museum');
          console.log('museum/ assets copied to dist-vercel/museum/');
        } catch (e) {
          console.warn('Could not copy museum/ folder:', e);
        }
      }
    }
  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  root: '.',
  build: {
    outDir: 'dist-vercel',
    emptyOutDir: true,
  },
});



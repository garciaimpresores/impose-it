import { defineConfig } from 'vite';

export default defineConfig({
  // Base path for GitHub Pages: /<repo-name>/
  // Will be updated when we know the repo name
  base: '/impose-it/',
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist'],
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
});

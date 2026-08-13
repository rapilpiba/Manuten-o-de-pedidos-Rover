import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Caminhos relativos: a aplicação funciona tanto na raiz de um domínio
  // quanto em uma subpasta (GitHub Pages, por exemplo).
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
          return null;
        }
      }
    }
  },
  test: {
    environment: 'jsdom'
  }
});

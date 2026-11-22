import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        portfolio: resolve(import.meta.dirname, 'index.html'),
        atlas: resolve(import.meta.dirname, 'atlas/index.html'),
      },
    },
  },
});

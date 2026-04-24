import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      'react': path.resolve(__dirname, './node_modules/react'),
      'react-dom': path.resolve(__dirname, './node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-data': ['swr', 'zustand'],
          'vendor-icons': ['lucide-react'],
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          'vendor-utils': ['date-fns', 'sonner'],
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-separator',
            '@radix-ui/react-switch',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-accordion',
          ],
        },
      },
    },
  },
  server: {
    port: 3006,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
});

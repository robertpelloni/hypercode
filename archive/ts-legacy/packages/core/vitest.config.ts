import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, '../../apps/web/src/') + '/',
    },
  },
  test: {
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.spec.ts',
      'mcp/**/*.test.ts',
      'mcp/**/*.spec.ts',
    ],
    exclude: [
      'test/**',
      'dist/**',
      'node_modules/**',
    ],
  },
});

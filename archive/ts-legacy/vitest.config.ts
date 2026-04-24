import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Resolve @/ as the apps/web/src/ root — matches Next.js tsconfig path alias
      '@/': path.resolve(__dirname, 'apps/web/src/') + '/',
    },
  },
  test: {
    environment: 'node',
  },
});

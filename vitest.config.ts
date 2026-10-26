import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'virtual:pwa-register': fileURLToPath(new URL('./tests/stubs/pwa-register.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    testTimeout: 20000,
    coverage: {
      provider: 'v8',
      include: ['src/domain/**', 'src/data/**'],
      exclude: ['src/**/*.d.ts'],
      reporter: ['text-summary', 'html', 'lcov'],
      thresholds: { lines: 70, functions: 70, branches: 70, statements: 70 },
    },
  },
});

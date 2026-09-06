import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@lib': r('./src/lib'),
      '@i18n': r('./src/i18n'),
      '@components': r('./src/components'),
      '@config': r('./src/config'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,mjs}'],
  },
});

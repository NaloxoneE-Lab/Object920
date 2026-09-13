// eslint.config.js
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.astro/**', 'public/**', '.opencode/**'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    rules: {
      // MVP 基线:先保证可用,后续按需收紧
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        Headers: 'readonly', // fetch 规范全局;deploy/cf-relay/worker.js 在 CF Workers 运行时使用
        fetch: 'readonly',
        crypto: 'readonly',
      },
    },
  },
);

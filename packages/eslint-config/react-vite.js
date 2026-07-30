import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactRefresh from 'eslint-plugin-react-refresh';
import { config as reactInternalConfig } from './react-internal.js';

/**
 * Shared ESLint configuration for React applications powered by Vite.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const config = defineConfig([
  ...reactInternalConfig,
  {
    name: '@repo/eslint-config/react-vite',
    files: ['**/*.{ts,tsx}'],
    extends: [reactRefresh.configs.vite],
  },
  eslintConfigPrettier,
]);

import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * Shared ESLint configuration for internal React libraries.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const config = defineConfig([
  ...baseConfig,
  {
    name: '@repo/eslint-config/react-internal',
    files: ['**/*.{ts,tsx}'],
    extends: [pluginReactHooks.configs.flat.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
  },
  eslintConfigPrettier,
]);

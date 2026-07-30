import pluginNext from '@next/eslint-plugin-next';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import { config as baseConfig } from './base.js';

/**
 * Shared ESLint configuration for Next.js applications.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const nextJsConfig = defineConfig([
  ...baseConfig,
  globalIgnores(['.next/**', 'build/**', 'next-env.d.ts', 'out/**']),
  {
    name: '@repo/eslint-config/next',
    files: ['**/*.{ts,tsx}'],
    extends: [pluginReactHooks.configs.flat.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
      },
    },
    plugins: {
      '@next/next': pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs['core-web-vitals'].rules,
    },
  },
  eslintConfigPrettier,
]);

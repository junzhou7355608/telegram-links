import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import turboPlugin from 'eslint-plugin-turbo';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint configuration for JavaScript and TypeScript packages.
 *
 * @type {import('eslint').Linter.Config[]}
 */
export const config = defineConfig([
  globalIgnores([
    '.next/**',
    '.turbo/**',
    'build/**',
    'coverage/**',
    'dist/**',
    'out/**',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,mts,cts}'],
    extends: [tseslint.configs.recommended],
  },
  {
    name: '@repo/eslint-config/turbo',
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      'turbo/no-undeclared-env-vars': 'error',
    },
  },
  eslintConfigPrettier,
]);

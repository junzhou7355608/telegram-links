import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { config as baseConfig } from './base.js';

/**
 * Creates a type-aware ESLint configuration for a NestJS application.
 *
 * @param {{ tsconfigRootDir: string }} options
 * @returns {import('eslint').Linter.Config[]}
 */
export function createNestConfig({ tsconfigRootDir }) {
  return defineConfig([
    ...baseConfig,
    {
      name: '@repo/eslint-config/nest',
      files: ['**/*.ts'],
      extends: [tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        globals: {
          ...globals.jest,
          ...globals.node,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
    eslintConfigPrettier,
  ]);
}

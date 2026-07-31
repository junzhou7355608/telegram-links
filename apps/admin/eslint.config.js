import pluginQuery from '@tanstack/eslint-plugin-query';
import { config } from '@repo/eslint-config/react-vite';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['src/api/**', 'src/routeTree.gen.ts']),
  ...config,
  ...pluginQuery.configs['flat/recommended-strict'],
  {
    files: ['src/routes/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);

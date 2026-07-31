// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config';
import { createNestConfig } from '@repo/eslint-config/nest';

export default defineConfig([
  globalIgnores(['src/generated/prisma/**']),
  ...createNestConfig({ tsconfigRootDir: import.meta.dirname }),
]);

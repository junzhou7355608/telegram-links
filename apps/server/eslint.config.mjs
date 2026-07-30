// @ts-check
import { createNestConfig } from '@repo/eslint-config/nest';

export default createNestConfig({ tsconfigRootDir: import.meta.dirname });

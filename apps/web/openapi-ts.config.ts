import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.json',
  output: {
    path: './src/api',
  },
  plugins: [
    {
      name: 'zod',
      requests: true,
      responses: true,
      definitions: true,
    },
    '@hey-api/schemas',
    '@hey-api/client-axios',
    {
      name: '@hey-api/sdk',
      validator: {
        response: 'zod',
      },
    },
    {
      enums: 'javascript',
      name: '@hey-api/typescript',
    },
    {
      name: '@tanstack/react-query',
      queryOptions: true,
    },
  ],
});

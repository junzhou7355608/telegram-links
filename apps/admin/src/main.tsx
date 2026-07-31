import '@/styles/global.css';

import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { client } from '@/api/client.gen';
import { axiosInstance } from '@/lib/request';
import { router } from '@/lib/router';

client.setConfig({
  axios: axiosInstance,
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root was not found.');
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);

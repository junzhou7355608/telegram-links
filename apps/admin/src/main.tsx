import '@/styles/global.css';

import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { adminAuthControllerSessionQueryKey } from '@/api/@tanstack/react-query.gen';
import { client } from '@/api/client.gen';
import { isAdminAuthRequiredError, safeAdminRedirect } from '@/lib/admin-auth';
import { queryClient } from '@/lib/query-client';
import { axiosInstance } from '@/lib/request';
import { router } from '@/lib/router';

client.setConfig({
  axios: axiosInstance,
  baseURL: import.meta.env.VITE_API_BASE_URL?.trim() || '',
});

axiosInstance.interceptors.response.use(undefined, (error: unknown) => {
  if (isAdminAuthRequiredError(error)) {
    queryClient.setQueryData(adminAuthControllerSessionQueryKey(), {
      authenticated: false,
    });
    const location = router.state.location;
    if (location.pathname !== '/login') {
      void router.navigate({
        to: '/login',
        replace: true,
        search: { redirect: safeAdminRedirect(location.href) },
      });
    }
  }
  return Promise.reject(error);
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

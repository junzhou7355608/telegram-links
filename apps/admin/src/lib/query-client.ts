import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) {
    return false;
  }
  if (isAxiosError(error) && error.response) {
    return error.response.status >= 500;
  }
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
    mutations: {
      retry: 0,
    },
  },
});

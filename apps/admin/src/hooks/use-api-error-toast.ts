import { getAdminApiError } from '@/lib/api-error';
import { useEffect } from 'react';
import { toast } from 'sonner';

export function useApiErrorToast(error: unknown) {
  useEffect(() => {
    if (!error) {
      return;
    }

    const apiError = getAdminApiError(error);
    const toastId = [
      'admin-api-error',
      apiError.statusCode,
      apiError.code,
      apiError.message,
    ].join(':');

    toast.error(apiError.message, { id: toastId });
  }, [error]);
}

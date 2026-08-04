import { z } from 'zod';
import { getAdminApiError } from './api-error';

export const DEFAULT_ADMIN_REDIRECT =
  '/links/pending?page=1&sort=newest' as const;

const protectedAdminPath =
  /^\/(?:links(?:\/pending)?|sync-jobs|taxonomy|telegram|ai-settings)(?:[/?#]|$)/u;

export const loginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export function safeAdminRedirect(value: string | undefined): string {
  if (!value || value.startsWith('//')) {
    return DEFAULT_ADMIN_REDIRECT;
  }
  try {
    const url = new URL(value, 'https://admin.local');
    if (
      url.origin !== 'https://admin.local' ||
      !protectedAdminPath.test(url.pathname)
    ) {
      return DEFAULT_ADMIN_REDIRECT;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_ADMIN_REDIRECT;
  }
}

export function isAdminAuthRequiredError(error: unknown): boolean {
  return getAdminApiError(error).code === 'ADMIN_AUTH_REQUIRED';
}

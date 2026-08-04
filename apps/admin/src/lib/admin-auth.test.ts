import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import {
  DEFAULT_ADMIN_REDIRECT,
  isAdminAuthRequiredError,
  safeAdminRedirect,
} from './admin-auth';

describe('Admin auth redirects', () => {
  it('preserves protected Admin locations and search parameters', () => {
    expect(
      safeAdminRedirect('/links/pending?page=2&sort=oldest#admin-content'),
    ).toBe('/links/pending?page=2&sort=oldest#admin-content');
    expect(safeAdminRedirect('/telegram?page=3')).toBe('/telegram?page=3');
  });

  it('rejects external, protocol-relative and login destinations', () => {
    expect(safeAdminRedirect('https://example.com/links')).toBe(
      DEFAULT_ADMIN_REDIRECT,
    );
    expect(safeAdminRedirect('//example.com/links')).toBe(
      DEFAULT_ADMIN_REDIRECT,
    );
    expect(safeAdminRedirect('/login')).toBe(DEFAULT_ADMIN_REDIRECT);
  });

  it('only treats the Admin session error as an expired login', () => {
    function apiError(code: string) {
      return new AxiosError('Unauthorized', '401', undefined, undefined, {
        config: { headers: new AxiosHeaders() },
        data: {
          code,
          message: 'Unauthorized',
          path: '/api/admin/v1/overview',
          statusCode: 401,
          timestamp: '2026-08-04T00:00:00.000Z',
        },
        headers: {},
        status: 401,
        statusText: 'Unauthorized',
      });
    }

    expect(isAdminAuthRequiredError(apiError('ADMIN_AUTH_REQUIRED'))).toBe(
      true,
    );
    expect(isAdminAuthRequiredError(apiError('TELEGRAM_NOT_AUTHORIZED'))).toBe(
      false,
    );
  });
});

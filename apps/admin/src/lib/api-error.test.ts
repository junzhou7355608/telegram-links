import type { ApiErrorResponseDto } from '@/api/types.gen';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getAdminApiError } from './api-error';

describe('getAdminApiError', () => {
  it('returns the typed Server error body', () => {
    const body: ApiErrorResponseDto = {
      code: 'LINK_URL_CONFLICT',
      message: '标准化后的 URL 已存在。',
      path: '/api/admin/v1/links/example',
      statusCode: 409,
      timestamp: '2026-08-01T00:00:00.000Z',
    };
    const error = new AxiosError('Conflict', '409', undefined, undefined, {
      config: { headers: new AxiosHeaders() },
      data: body,
      headers: {},
      status: 409,
      statusText: 'Conflict',
    });

    expect(getAdminApiError(error)).toEqual(body);
  });

  it('uses a useful message for network failures', () => {
    expect(getAdminApiError(new AxiosError('Network Error'))).toMatchObject({
      code: 'NETWORK_ERROR',
      statusCode: 0,
    });
  });
});

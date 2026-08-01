import type { ApiErrorResponseDto } from '@/api/types.gen';
import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { getWebApiError } from './api-error';

describe('getWebApiError', () => {
  it('returns the typed Server error response', () => {
    const serverError: ApiErrorResponseDto = {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: '请求参数校验失败。',
      details: ['q must be shorter than or equal to 200 characters'],
      path: '/api/web/v1/links',
      timestamp: '2026-08-01T00:00:00.000Z',
    };
    const error = new AxiosError(
      'Bad Request',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        config: { headers: new AxiosHeaders() },
        data: serverError,
        headers: {},
        status: 400,
        statusText: 'Bad Request',
      },
    );
    expect(getWebApiError(error)).toEqual(serverError);
  });

  it('returns a stable network error', () => {
    expect(getWebApiError(new AxiosError('Network Error'))).toEqual(
      expect.objectContaining({ code: 'NETWORK_ERROR', statusCode: 0 }),
    );
  });
});

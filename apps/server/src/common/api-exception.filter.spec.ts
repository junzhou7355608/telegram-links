import { ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  it('hides unknown exception details behind the stable error contract', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    let responseBody: unknown;
    const json = jest.fn((value: unknown) => {
      responseBody = value;
    });
    const status = jest.fn(() => ({ json })) as unknown as Response['status'];
    const request = { originalUrl: '/api/admin/v1/example' } as Request;
    const response = { status } as Response;
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as ArgumentsHost;

    new ApiExceptionFilter().catch(new Error('database secret'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INTERNAL_SERVER_ERROR',
        message: '服务端发生未知错误。',
        path: '/api/admin/v1/example',
        statusCode: 500,
      }),
    );
    expect(JSON.stringify(responseBody)).not.toContain('database secret');
  });
});

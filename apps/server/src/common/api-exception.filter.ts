import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorPayload {
  code?: unknown;
  details?: unknown;
  message?: unknown;
}

function isErrorPayload(value: unknown): value is ErrorPayload {
  return typeof value === 'object' && value !== null;
}

function defaultErrorCode(status: number): string {
  const value: unknown = HttpStatus[status];
  return typeof value === 'string' ? value : 'HTTP_ERROR';
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload: unknown = isHttpException ? exception.getResponse() : null;
    const value = isErrorPayload(payload) ? payload : {};
    const details = Array.isArray(value.details)
      ? value.details.filter((item): item is string => typeof item === 'string')
      : undefined;
    const message =
      typeof value.message === 'string'
        ? value.message
        : isHttpException
          ? exception.message
          : '服务端发生未知错误。';

    if (!isHttpException) {
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      code:
        typeof value.code === 'string' ? value.code : defaultErrorCode(status),
      ...(details?.length ? { details } : {}),
      message,
      path: request.originalUrl,
      statusCode: status,
      timestamp: new Date().toISOString(),
    });
  }
}

import type { ApiErrorResponseDto } from '@/api/types.gen';
import { isAxiosError } from 'axios';

export interface AdminApiError extends ApiErrorResponseDto {
  details?: string[];
}

function isApiError(value: unknown): value is ApiErrorResponseDto {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ApiErrorResponseDto>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string' &&
    typeof candidate.path === 'string' &&
    typeof candidate.statusCode === 'number' &&
    typeof candidate.timestamp === 'string'
  );
}

export function getAdminApiError(error: unknown): AdminApiError {
  if (isAxiosError(error)) {
    if (isApiError(error.response?.data)) {
      return error.response.data;
    }
    if (!error.response) {
      return {
        code: 'NETWORK_ERROR',
        message: '无法连接本地 Server，请确认服务已经启动。',
        path: '',
        statusCode: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
  return {
    code: 'UNKNOWN_CLIENT_ERROR',
    message: error instanceof Error ? error.message : '发生未知客户端错误。',
    path: '',
    statusCode: 0,
    timestamp: new Date().toISOString(),
  };
}

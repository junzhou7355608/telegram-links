import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiGoneResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiServiceUnavailableResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class ApiErrorResponseDto {
  @ApiProperty({ example: 400, type: Number })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR', type: String })
  code!: string;

  @ApiProperty({ example: '请求参数校验失败。', type: String })
  message!: string;

  @ApiPropertyOptional({ isArray: true, type: String })
  details?: string[];

  @ApiProperty({ example: '/api/admin/v1/links', type: String })
  path!: string;

  @ApiProperty({ format: 'date-time', type: String })
  timestamp!: string;
}

export function ApiCommonErrorResponses() {
  return applyDecorators(
    ApiBadRequestResponse({ type: ApiErrorResponseDto }),
    ApiNotFoundResponse({ type: ApiErrorResponseDto }),
    ApiConflictResponse({ type: ApiErrorResponseDto }),
    ApiInternalServerErrorResponse({ type: ApiErrorResponseDto }),
  );
}

export function ApiTelegramErrorResponses() {
  return applyDecorators(
    ApiCommonErrorResponses(),
    ApiUnauthorizedResponse({ type: ApiErrorResponseDto }),
    ApiGoneResponse({ type: ApiErrorResponseDto }),
    ApiServiceUnavailableResponse({ type: ApiErrorResponseDto }),
  );
}

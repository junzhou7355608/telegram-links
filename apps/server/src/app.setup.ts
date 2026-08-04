import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  ADMIN_AUTH_SECURITY_NAME,
  ADMIN_SESSION_COOKIE_NAME,
} from './auth/admin-auth.constants';
import { ApiExceptionFilter } from './common/api-exception.filter';

function validationDetails(errors: ValidationError[], parent = ''): string[] {
  return errors.flatMap((error) => {
    const path = parent ? `${parent}.${error.property}` : error.property;
    const current = Object.values(error.constraints ?? {}).map(
      (message) => `${path}: ${message}`,
    );
    return [...current, ...validationDetails(error.children ?? [], path)];
  });
}

export function configureApplication(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  app.set('trust proxy', 'loopback');
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ApiExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          details: validationDetails(errors),
          message: '请求参数校验失败。',
        }),
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );

  if (configService.get<string>('SWAGGER_ENABLED') !== 'true') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Telegram Links API')
    .setDescription('Telegram Links 服务端 API 文档')
    .setVersion('1.0')
    .addCookieAuth(
      ADMIN_SESSION_COOKIE_NAME,
      { in: 'cookie', type: 'apiKey' },
      ADMIN_AUTH_SECURITY_NAME,
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: '/docs-json',
    raw: ['json'],
  });
}

import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureApplication(app: INestApplication): void {
  const configService = app.get(ConfigService);

  app.enableShutdownHooks();
  app.setGlobalPrefix('api');

  if (configService.get<string>('SWAGGER_ENABLED') !== 'true') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Telegram Links API')
    .setDescription('Telegram Links 服务端 API 文档')
    .setVersion('1.0')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, documentFactory, {
    jsonDocumentUrl: '/docs-json',
    raw: ['json'],
  });
}

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApplication } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  configureApplication(app);

  const port = Number.parseInt(configService.get<string>('PORT') ?? '3000', 10);
  const host = configService.get<string>('HOST') ?? '127.0.0.1';
  await app.listen(port, host);
}
void bootstrap();

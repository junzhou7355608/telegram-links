import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';

describe('Server infrastructure (e2e)', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSwaggerEnabled = process.env.SWAGGER_ENABLED;

  async function createTestApplication(
    swaggerEnabled: boolean,
  ): Promise<INestApplication<App>> {
    process.env.DATABASE_URL =
      'postgresql://telegram_links:telegram_links@localhost:5433/telegram_links?schema=public';
    process.env.SWAGGER_ENABLED = String(swaggerEnabled);

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const app = moduleFixture.createNestApplication();

    configureApplication(app);
    await app.init();

    return app;
  }

  afterAll(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    if (originalSwaggerEnabled === undefined) {
      delete process.env.SWAGGER_ENABLED;
    } else {
      process.env.SWAGGER_ENABLED = originalSwaggerEnabled;
    }
  });

  it('serves an empty OpenAPI document when Swagger is enabled', async () => {
    const app = await createTestApplication(true);

    try {
      const response = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      expect(response.body).toMatchObject({
        info: {
          title: 'Telegram Links API',
          version: '1.0',
        },
        paths: {},
      });
      await request(app.getHttpServer())
        .get('/docs')
        .expect('Content-Type', /html/)
        .expect(200);
      await request(app.getHttpServer()).get('/').expect(404);
      await request(app.getHttpServer()).get('/api').expect(404);
    } finally {
      await app.close();
    }
  });

  it('does not expose Swagger when it is disabled', async () => {
    const app = await createTestApplication(false);

    try {
      await request(app.getHttpServer()).get('/docs').expect(404);
      await request(app.getHttpServer()).get('/docs-json').expect(404);
    } finally {
      await app.close();
    }
  });
});

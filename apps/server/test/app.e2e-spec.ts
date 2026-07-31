import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { SyncRangeMode } from '../src/generated/prisma/client';
import { SyncJobsService } from '../src/sync/sync-jobs.service';
import {
  type GatewayChat,
  type GatewayMessage,
  type MessageRange,
  type SendCodeResult,
  type SignInResult,
  type TelegramUserProfile,
  TelegramGateway,
} from '../src/telegram/telegram.gateway';

const testDatabaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://telegram_links:telegram_links@localhost:5433/telegram_links?schema=telegram_links_test';
const testEncryptionKey = Buffer.alloc(32, 3).toString('base64');

function assertIsolatedTestSchema(): void {
  const schema = new URL(testDatabaseUrl).searchParams.get('schema');
  if (!schema || !schema.toLowerCase().includes('test')) {
    throw new Error('E2E requires an isolated PostgreSQL test schema.');
  }
}

class FakeTelegramGateway extends TelegramGateway {
  private authorized = false;

  readonly dialogs: GatewayChat[] = [
    {
      telegramPeerId: '-1001234567890',
      title: '研发协作群',
      type: 'group',
      username: 'dev_team',
    },
    {
      telegramPeerId: '-1009999999999',
      title: '异常测试群',
      type: 'group',
    },
  ];

  readonly messages: GatewayMessage[] = [
    {
      messageId: 101,
      messageUrl: 'https://t.me/dev_team/101',
      senderName: 'Jun',
      senderTelegramId: '42',
      sentAt: new Date('2026-07-30T08:00:00.000Z'),
      text: '仓库 https://github.com/example/project/',
      urls: ['https://github.com/example/project/'],
    },
    {
      messageId: 102,
      messageUrl: 'https://t.me/dev_team/102',
      senderName: 'Jun',
      senderTelegramId: '42',
      sentAt: new Date('2026-07-30T09:00:00.000Z'),
      text: '再发一次仓库并附上文档',
      urls: [
        'https://github.com/example/project',
        'https://docs.example.com/start',
      ],
    },
  ];

  isConfigured(): boolean {
    return true;
  }

  connectWithSession(): Promise<boolean> {
    this.authorized = true;
    return Promise.resolve(true);
  }

  resetSession(): Promise<void> {
    this.authorized = false;
    return Promise.resolve();
  }

  checkAuthorization(): Promise<boolean> {
    return Promise.resolve(this.authorized);
  }

  sendCode(): Promise<SendCodeResult> {
    return Promise.resolve({ isCodeViaApp: true, phoneCodeHash: 'hash' });
  }

  signInWithCode(): Promise<SignInResult> {
    return Promise.resolve({ status: 'passwordRequired' });
  }

  async signInWithPassword(): Promise<TelegramUserProfile> {
    this.authorized = true;
    return this.getCurrentUser();
  }

  getCurrentUser(): Promise<TelegramUserProfile> {
    return Promise.resolve({
      displayName: 'Jun',
      phoneNumber: '8613800000000',
      telegramUserId: '42',
      username: 'jun',
    });
  }

  getSession(): string {
    return 'fake-string-session';
  }

  getDialogs(): Promise<GatewayChat[]> {
    return Promise.resolve(this.dialogs);
  }

  async *getMessages(
    telegramPeerId: string,
    range: MessageRange,
  ): AsyncIterable<GatewayMessage> {
    await Promise.resolve();
    if (telegramPeerId === '-1009999999999') {
      throw new Error('Fake Telegram chat failure');
    }
    for (const message of this.messages) {
      if (range.minId && message.messageId <= range.minId) {
        continue;
      }
      if (range.from && message.sentAt < range.from) {
        continue;
      }
      if (range.to && message.sentAt > range.to) {
        continue;
      }
      yield message;
    }
  }

  logOut(): Promise<void> {
    this.authorized = false;
    return Promise.resolve();
  }

  async disconnect(): Promise<void> {}
}

describe('Server API (e2e)', () => {
  async function createTestApplication(
    swaggerEnabled: boolean,
  ): Promise<INestApplication<App>> {
    assertIsolatedTestSchema();
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.SWAGGER_ENABLED = String(swaggerEnabled);
    process.env.TELEGRAM_API_ID = '12345';
    process.env.TELEGRAM_API_HASH = 'test-api-hash';
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = testEncryptionKey;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramGateway)
      .useClass(FakeTelegramGateway)
      .compile();
    const app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
    await clearDatabase(app.get(PrismaService));
    return app;
  }

  async function clearDatabase(prisma: PrismaService): Promise<void> {
    await prisma.linkSource.deleteMany();
    await prisma.linkTag.deleteMany();
    await prisma.telegramMessage.deleteMany();
    await prisma.syncJobChat.deleteMany();
    await prisma.syncJob.deleteMany();
    await prisma.link.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.category.deleteMany();
    await prisma.project.deleteMany();
    await prisma.telegramChat.deleteMany();
    await prisma.telegramAccount.deleteMany();
  }

  async function closeApplication(app: INestApplication<App>): Promise<void> {
    await clearDatabase(app.get(PrismaService));
    await app.close();
  }

  it('documents separated Web and Admin paths', async () => {
    const app = await createTestApplication(true);
    try {
      const response = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);
      const document = responseBody<{
        info: { title: string; version: string };
        paths: Record<string, unknown>;
      }>(response);
      expect(document.info).toMatchObject({
        title: 'Telegram Links API',
        version: '1.0',
      });
      expect(document.paths).toHaveProperty('/api/web/v1/links');
      expect(document.paths).toHaveProperty('/api/admin/v1/links');
      expect(document.paths).toHaveProperty('/api/admin/v1/telegram/auth/code');
      await request(app.getHttpServer()).get('/docs').expect(200);
      await request(app.getHttpServer()).get('/').expect(404);
    } finally {
      await closeApplication(app);
    }
  });

  it('authorizes, syncs, deduplicates, searches and archives links', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      const codeResponse = await request(server)
        .post('/api/admin/v1/telegram/auth/code')
        .send({ phoneNumber: '+8613800000000' })
        .expect(202);
      const code = responseBody<{ challengeId: string }>(codeResponse);
      await request(server)
        .post('/api/admin/v1/telegram/auth/code/verify')
        .send({ challengeId: code.challengeId, code: '12345' })
        .expect(200)
        .expect({ status: 'passwordRequired' });
      await request(server)
        .post('/api/admin/v1/telegram/auth/password/verify')
        .send({ challengeId: code.challengeId, password: 'local-test-only' })
        .expect(200)
        .expect({ status: 'authorized' });

      await request(server)
        .post('/api/admin/v1/telegram/chats/refresh')
        .expect(200);
      const chats = await request(server)
        .get('/api/admin/v1/telegram/chats')
        .expect(200);
      const chatItems = responseBody<{
        items: Array<{ id: string; title: string }>;
      }>(chats).items;
      const sourceChat = chatItems.find((chat) => chat.title === '研发协作群');
      if (!sourceChat) {
        throw new Error('Expected the fake source chat');
      }
      const chatId = sourceChat.id;

      const project = await request(server)
        .post('/api/admin/v1/taxonomy/projects')
        .send({ name: 'Atlas' })
        .expect(201);
      const category = await request(server)
        .post('/api/admin/v1/taxonomy/categories')
        .send({ name: '代码仓库' })
        .expect(201);
      const tag = await request(server)
        .post('/api/admin/v1/taxonomy/tags')
        .send({ name: '后端' })
        .expect(201);
      const projectBody = responseBody<{ id: string }>(project);
      const categoryBody = responseBody<{ id: string }>(category);
      const tagBody = responseBody<{ id: string }>(tag);

      const createdJob = await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: [chatId],
          defaultCategoryId: categoryBody.id,
          defaultProjectId: projectBody.id,
          defaultTagIds: [tagBody.id],
          rangeMode: 'allHistory',
        })
        .expect(202);
      const job = await waitForJob(
        server,
        responseBody<{ id: string }>(createdJob).id,
      );
      expect(job).toMatchObject({
        duplicateCount: 1,
        foundCount: 3,
        newCount: 2,
        status: 'succeeded',
      });
      const partialJob = await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: chatItems.map((chat) => chat.id),
          rangeMode: 'allHistory',
        })
        .expect(202);
      await expect(
        waitForJob(server, responseBody<{ id: string }>(partialJob).id),
      ).resolves.toMatchObject({ status: 'partiallySucceeded' });

      const webLinks = await request(server)
        .get('/api/web/v1/links?q=github')
        .expect(200);
      const linksBody = responseBody<{
        items: [{ id: string }];
        pagination: { total: number };
      }>(webLinks);
      expect(linksBody.pagination.total).toBe(1);
      const linkId = linksBody.items[0].id;
      const taggedLinks = await request(server)
        .get(`/api/web/v1/links?tagIds=${tagBody.id}`)
        .expect(200);
      expect(
        responseBody<{ pagination: { total: number } }>(taggedLinks).pagination
          .total,
      ).toBe(2);
      const detail = await request(server)
        .get(`/api/web/v1/links/${linkId}`)
        .expect(200);
      expect(responseBody<{ sourceCount: number }>(detail).sourceCount).toBe(2);
      await request(server)
        .patch(`/api/web/v1/links/${linkId}`)
        .send({ title: 'Web 不应允许编辑' })
        .expect(404);
      await request(server)
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({
          purpose: '项目代码仓库',
          status: 'organized',
          title: 'Project repository',
        })
        .expect(200);

      const allLinks = await request(server)
        .get('/api/admin/v1/links?pageSize=100')
        .expect(200);
      const allLinkItems = responseBody<{ items: Array<{ id: string }> }>(
        allLinks,
      ).items;
      const otherLink = allLinkItems.find((item) => item.id !== linkId);
      if (!otherLink) {
        throw new Error('Expected a second synchronized link');
      }
      await request(server)
        .patch(`/api/admin/v1/links/${otherLink.id}`)
        .send({ url: 'https://github.com/example/project/' })
        .expect(409);

      await request(server).delete(`/api/admin/v1/links/${linkId}`).expect(204);
      await request(server).get(`/api/web/v1/links/${linkId}`).expect(404);
      await request(server)
        .post(`/api/admin/v1/links/${linkId}/restore`)
        .expect(200);
      await request(server)
        .delete(`/api/admin/v1/taxonomy/projects/${projectBody.id}`)
        .expect(409);
    } finally {
      await closeApplication(app);
    }
  });

  it('does not expose Swagger when disabled and rejects unknown DTO fields', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      await request(server).get('/docs').expect(404);
      await request(server).get('/docs-json').expect(404);
      await request(server)
        .post('/api/admin/v1/telegram/auth/code')
        .send({ phoneNumber: '+8613800000000', unexpected: true })
        .expect(400);
      const prisma = app.get(PrismaService);
      const pendingJob = await prisma.syncJob.create({
        data: { defaultTagIds: [], rangeMode: SyncRangeMode.ALL_HISTORY },
      });
      await app.get(SyncJobsService).onModuleInit();
      await expect(
        prisma.syncJob.findUnique({ where: { id: pendingJob.id } }),
      ).resolves.toMatchObject({ status: 'INTERRUPTED' });
    } finally {
      await closeApplication(app);
    }
  });
});

async function waitForJob(server: App, id: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await request(server)
      .get(`/api/admin/v1/sync-jobs/${id}`)
      .expect(200);
    const job = responseBody<Record<string, unknown> & { status: string }>(
      response,
    );
    if (!['queued', 'running'].includes(job.status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for sync job');
}

function responseBody<T>(response: { text: string }): T {
  const parsed: unknown = JSON.parse(response.text);
  return parsed as T;
}

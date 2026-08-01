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
    {
      telegramPeerId: '-1007777777777',
      title: '链接扫描测试群',
      type: 'group',
    },
  ];

  readonly messages: GatewayMessage[] = [
    {
      context: { previous: [] },
      messageId: 101,
      messageUrl: 'https://t.me/dev_team/101',
      senderName: 'Jun',
      senderTelegramId: '42',
      sentAt: new Date('2026-07-30T08:00:00.000Z'),
      text: '仓库 https://github.com/example/project/',
      urls: ['https://github.com/example/project/'],
    },
    {
      context: {
        previous: [
          {
            sentAt: new Date('2026-07-30T08:58:00.000Z'),
            senderName: 'Jun',
            text: '这是 Atlas 项目的正式仓库和文档。',
          },
        ],
        reply: {
          sentAt: new Date('2026-07-30T08:55:00.000Z'),
          senderName: 'Jun',
          text: '请归类到研发资料。',
        },
      },
      messageId: 102,
      messageUrl: 'https://t.me/dev_team/102',
      senderName: 'Jun',
      senderTelegramId: '42',
      sentAt: new Date('2026-07-30T09:00:00.000Z'),
      text: '再发一次仓库并附上文档',
      urls: [
        'https://github.com/example/project',
        'https://docs.example.com/start',
        'https://github.com/example/project?tab=readme',
      ],
    },
  ];

  readonly extraMessage: GatewayMessage = {
    context: { previous: [] },
    messageId: 201,
    sentAt: new Date('2026-07-30T10:00:00.000Z'),
    text: '链接扫描测试 https://scan.example.com',
    urls: ['https://scan.example.com'],
  };

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
    const messages =
      telegramPeerId === '-1007777777777'
        ? [this.extraMessage]
        : this.messages;
    for (const message of messages) {
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
    const prisma = app.get(PrismaService);
    if (!prisma.schemaName.toLowerCase().includes('test')) {
      await app.close();
      throw new Error(
        `E2E Prisma adapter resolved unsafe schema: ${prisma.schemaName}`,
      );
    }
    await clearDatabase(prisma);
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
        components: { schemas: Record<string, unknown> };
        info: { title: string; version: string };
        paths: Record<
          string,
          Record<
            string,
            {
              responses?: Record<
                string,
                { content?: Record<string, { schema?: unknown }> }
              >;
            }
          >
        >;
      }>(response);
      expect(document.info).toMatchObject({
        title: 'Telegram Links API',
        version: '1.0',
      });
      expect(document.paths).toHaveProperty('/api/web/v1/links');
      expect(document.paths).toHaveProperty('/api/admin/v1/links');
      expect(document.paths).not.toHaveProperty('/api/admin/v1/ai/settings');
      expect(document.paths).toHaveProperty('/api/admin/v1/telegram/auth/code');
      expect(document.paths).toHaveProperty(
        '/api/admin/v1/telegram/chats/scan-options',
      );
      expect(document.paths).not.toHaveProperty(
        '/api/admin/v1/telegram/chats/{id}',
      );
      expect(JSON.stringify(document)).not.toMatch(
        /isEnabled|isFavorite|favorites/u,
      );
      for (const [path, pathItem] of Object.entries(document.paths)) {
        for (const [method, operation] of Object.entries(pathItem)) {
          if (!operation.responses) {
            continue;
          }
          for (const [status, documentedResponse] of Object.entries(
            operation.responses,
          )) {
            if (!status.startsWith('2') || status === '204') {
              continue;
            }
            expect(
              documentedResponse.content?.['application/json']?.schema,
            ).toBeDefined();
          }
          expect(method).not.toBe('trace');
          expect(path).toMatch(/^\/api\/(?:web|admin)\/v1/u);
        }
      }
      expect(document.components.schemas).toHaveProperty('ApiErrorResponseDto');
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
      expect(codeResponse.body).not.toHaveProperty('phoneCodeHash');
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
      const unavailableChat = chatItems.find(
        (chat) => chat.title === '异常测试群',
      );
      const sourceChat = chatItems.find((chat) => chat.title === '研发协作群');
      if (!sourceChat || !unavailableChat) {
        throw new Error('Expected the fake Telegram chats');
      }
      const chatId = sourceChat.id;
      await app.get(PrismaService).telegramChat.update({
        data: { isAvailable: false },
        where: { id: unavailableChat.id },
      });
      const scanOptions = await request(server)
        .get('/api/admin/v1/telegram/chats/scan-options')
        .expect(200);
      const optionItems = responseBody<{
        items: Array<{ id: string; title: string }>;
      }>(scanOptions).items;
      expect(optionItems).toHaveLength(2);
      expect(optionItems.map(({ id }) => id)).not.toContain(unavailableChat.id);
      expect(JSON.stringify(scanOptions.body)).not.toContain('isEnabled');
      await app.get(PrismaService).telegramChat.update({
        data: { isAvailable: true },
        where: { id: unavailableChat.id },
      });

      const category = await request(server)
        .post('/api/admin/v1/taxonomy/categories')
        .send({ name: '代码仓库' })
        .expect(201);
      const tag = await request(server)
        .post('/api/admin/v1/taxonomy/tags')
        .send({ name: '后端' })
        .expect(201);
      const categoryBody = responseBody<{ id: string }>(category);
      const tagBody = responseBody<{ id: string }>(tag);

      await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({ rangeMode: 'allHistory' })
        .expect(400);
      await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({ chatIds: [], rangeMode: 'allHistory' })
        .expect(400);
      await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: ['00000000-0000-4000-8000-000000000001'],
          rangeMode: 'allHistory',
        })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'INVALID_SYNC_CHATS' }),
          );
        });
      await app.get(PrismaService).telegramChat.update({
        data: { isAvailable: false },
        where: { id: chatId },
      });
      await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({ chatIds: [chatId], rangeMode: 'allHistory' })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'INVALID_SYNC_CHATS' }),
          );
        });
      await app.get(PrismaService).telegramChat.update({
        data: { isAvailable: true },
        where: { id: chatId },
      });

      const createdJob = await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: [chatId],
          defaultCategoryId: categoryBody.id,
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
      const partialResult = await waitForJob<{
        chats: Array<{
          chatTitle: string;
          foundCount: number;
          newCount: number;
          status: string;
        }>;
        status: string;
      }>(server, responseBody<{ id: string }>(partialJob).id);
      expect(partialResult.status).toBe('partiallySucceeded');
      expect(partialResult.chats).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            chatTitle: '链接扫描测试群',
            foundCount: 1,
            newCount: 1,
            status: 'succeeded',
          }),
        ]),
      );
      const extraChat = await app
        .get(PrismaService)
        .telegramChat.findFirst({
          where: { title: '链接扫描测试群' },
        });
      expect(extraChat?.lastSyncedMessageId).toBe(201);
      await expect(
        app.get(PrismaService).link.findUnique({
          where: { domain: 'scan.example.com' },
        }),
      ).resolves.toMatchObject({
        status: 'PENDING',
        title: 'scan.example.com',
      });

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
      const detailBody = responseBody<{
        sourceCount: number;
        sources: Array<{ rawUrl: string }>;
        url: string;
      }>(detail);
      expect(detailBody.sourceCount).toBe(3);
      expect(detailBody.url).toBe(
        'https://github.com/example/project?tab=readme',
      );
      expect(detailBody.sources.map(({ rawUrl }) => rawUrl)).toContain(
        'https://github.com/example/project?tab=readme',
      );
      await request(server)
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ url: 'https://github.com/example/project?manual=1' })
        .expect(200)
        .expect((response) => {
          expect(responseBody<{ url: string }>(response).url).toBe(
            'https://github.com/example/project?manual=1',
          );
        });
      await request(server)
        .get(`/api/admin/v1/links?sourceChatId=${chatId}`)
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<{ pagination: { total: number } }>(response).pagination
              .total,
          ).toBe(2);
        });
      const docsLink = await app.get(PrismaService).link.findUniqueOrThrow({
        where: { domain: 'docs.example.com' },
      });
      await request(server)
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ url: `${docsLink.url}?conflict=1` })
        .expect(409)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'LINK_DOMAIN_CONFLICT' }),
          );
        });
      expect(detail.body).not.toHaveProperty('isFavorite');
      const adminDetail = await request(server)
        .get(`/api/admin/v1/links/${linkId}`)
        .expect(200);
      expect(adminDetail.body).not.toHaveProperty('aiAnalysis');
      expect(adminDetail.body).not.toHaveProperty('project');
      expect(adminDetail.body).not.toHaveProperty('environment');
      const overview = await request(server)
        .get('/api/web/v1/overview')
        .expect(200);
      const overviewBody = responseBody<{
        counts: { pending: number; total: number };
      }>(overview);
      expect(overviewBody.counts).toEqual(
        expect.objectContaining({ pending: 3, total: 3 }),
      );
      expect(overviewBody.counts).not.toHaveProperty('favorites');
      await request(server)
        .patch(`/api/web/v1/links/${linkId}`)
        .send({ title: 'Web 不应允许编辑' })
        .expect(404);
      await request(server)
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ isFavorite: true })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'VALIDATION_ERROR' }),
          );
        });
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
        .expect(409)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              code: 'LINK_DOMAIN_CONFLICT',
              path: `/api/admin/v1/links/${otherLink.id}`,
              statusCode: 409,
            }),
          );
        });

      await request(server).delete(`/api/admin/v1/links/${linkId}`).expect(204);
      await request(server).get(`/api/web/v1/links/${linkId}`).expect(404);
      await request(server)
        .post(`/api/admin/v1/links/${linkId}/restore`)
        .expect(200);
      await request(server)
        .delete(`/api/admin/v1/taxonomy/categories/${categoryBody.id}`)
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
      const validationResponse = await request(server)
        .post('/api/admin/v1/telegram/auth/code')
        .send({ phoneNumber: '+8613800000000', unexpected: true })
        .expect(400);
      const validationBody = responseBody<{
        code: string;
        details: unknown;
        message: string;
        path: string;
        statusCode: number;
        timestamp: unknown;
      }>(validationResponse);
      expect(validationBody).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: '请求参数校验失败。',
        path: '/api/admin/v1/telegram/auth/code',
        statusCode: 400,
      });
      expect(Array.isArray(validationBody.details)).toBe(true);
      expect(typeof validationBody.timestamp).toBe('string');
      await request(server)
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: ['00000000-0000-4000-8000-000000000001'],
          rangeMode: 'allHistory',
        })
        .expect(401)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'TELEGRAM_NOT_AUTHORIZED' }),
          );
        });
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

async function waitForJob<
  Result extends { status: string } = Record<string, unknown> & {
    status: string;
  },
>(server: App, id: string): Promise<Result> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await request(server)
      .get(`/api/admin/v1/sync-jobs/${id}`)
      .expect(200);
    const job = responseBody<Result>(response);
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

import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service';
import { SyncRangeMode } from '../src/generated/prisma/client';
import { LinksService } from '../src/links/links.service';
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
const testAdminPassword = 'test-admin-password';
const testAdminUsername = 'test-admin';
const testAdminPasswordHash = hashSync(testAdminPassword, 4);
const testAdminSessionSecret = Buffer.alloc(32, 5).toString('base64');
type TestAgent = ReturnType<typeof request.agent>;

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
      telegramPeerId === '-1007777777777' ? [this.extraMessage] : this.messages;
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
  ): Promise<NestExpressApplication> {
    assertIsolatedTestSchema();
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.SWAGGER_ENABLED = String(swaggerEnabled);
    process.env.BASIC_AUTH_USERNAME = testAdminUsername;
    process.env.BASIC_AUTH_PASSWORD_HASH = testAdminPasswordHash;
    process.env.ADMIN_AUTH_SESSION_SECRET = testAdminSessionSecret;
    process.env.TELEGRAM_API_ID = '12345';
    process.env.TELEGRAM_API_HASH = 'test-api-hash';
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = testEncryptionKey;

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TelegramGateway)
      .useClass(FakeTelegramGateway)
      .compile();
    const app = moduleFixture.createNestApplication<NestExpressApplication>();
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

  async function closeApplication(app: INestApplication): Promise<void> {
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
      expect(document.paths).toHaveProperty('/api/admin/v1/auth/session');
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
      expect(document.components).toHaveProperty(
        'securitySchemes.adminSession',
      );
      await request(app.getHttpServer()).get('/docs').expect(200);
      await request(app.getHttpServer()).get('/').expect(404);
    } finally {
      await closeApplication(app);
    }
  });

  it('keeps Web public and protects Admin with a cookie session', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      await request(server).get('/api/healthz').expect(200);
      await request(server).get('/api/web/v1/overview').expect(200);
      await request(server)
        .get('/api/admin/v1/overview')
        .expect(401)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'ADMIN_AUTH_REQUIRED' }),
          );
        });
      await request(server)
        .post('/api/admin/v1/links')
        .send({ title: '未授权链接', url: 'https://unauthorized.example' })
        .expect(401);
      await request(server)
        .get('/api/admin/v1/auth/session')
        .expect(200, { authenticated: false });
      await request(server)
        .post('/api/admin/v1/auth/session')
        .send({ username: testAdminUsername, password: 'wrong-password' })
        .expect(401)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'INVALID_ADMIN_CREDENTIALS' }),
          );
        });

      const api = request.agent(server);
      const login = await api
        .post('/api/admin/v1/auth/session')
        .send({
          username: testAdminUsername,
          password: testAdminPassword,
        })
        .expect(200)
        .expect({ authenticated: true, username: testAdminUsername });
      expect(login.headers['set-cookie']?.[0]).toMatch(/HttpOnly/u);
      expect(login.headers['set-cookie']?.[0]).toMatch(
        /Path=\/api\/admin\/v1/u,
      );
      expect(login.headers['set-cookie']?.[0]).toMatch(/SameSite=Strict/u);

      await api
        .get('/api/admin/v1/auth/session')
        .expect(200, { authenticated: true, username: testAdminUsername });
      await api.get('/api/admin/v1/overview').expect(200);
      await api.delete('/api/admin/v1/auth/session').expect(204);
      await api
        .get('/api/admin/v1/auth/session')
        .expect(200, { authenticated: false });
      await api.get('/api/admin/v1/overview').expect(401);
    } finally {
      await closeApplication(app);
    }
  });

  it('persists independent taxonomy orders and exposes them to Web', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      await request(server)
        .put('/api/admin/v1/taxonomy/categories/order')
        .send({ ids: [] })
        .expect(401);
      const api = await createAdminAgent(server);

      const categoryOne = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/categories')
          .send({ name: '乙分类' })
          .expect(201),
      );
      const categoryTwo = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/categories')
          .send({ name: '甲分类' })
          .expect(201),
      );
      const tagOne = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '第二标签' })
          .expect(201),
      );
      const tagTwo = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '第一标签' })
          .expect(201),
      );
      const tagThree = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '第三标签' })
          .expect(201),
      );

      await api
        .get('/api/admin/v1/taxonomy/categories')
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<Array<{ id: string }>>(response).map(
              (item) => item.id,
            ),
          ).toEqual([categoryOne.id, categoryTwo.id]);
        });

      const categoryIds = [categoryTwo.id, categoryOne.id];
      const tagIds = [tagThree.id, tagOne.id, tagTwo.id];
      await api
        .put('/api/admin/v1/taxonomy/categories/order')
        .send({ ids: categoryIds })
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<Array<{ id: string }>>(response).map(
              (item) => item.id,
            ),
          ).toEqual(categoryIds);
        });
      await api
        .put('/api/admin/v1/taxonomy/tags/order')
        .send({ ids: tagIds })
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<Array<{ id: string }>>(response).map(
              (item) => item.id,
            ),
          ).toEqual(tagIds);
        });

      const invalidOrders = [
        [tagThree.id, tagOne.id],
        [tagThree.id, tagThree.id, tagTwo.id],
        [tagThree.id, '00000000-0000-4000-8000-000000000999', tagTwo.id],
      ];
      for (const ids of invalidOrders) {
        await api
          .put('/api/admin/v1/taxonomy/tags/order')
          .send({ ids })
          .expect(400)
          .expect((response) => {
            expect(response.body).toEqual(
              expect.objectContaining({ code: 'INVALID_TAXONOMY_ORDER' }),
            );
          });
      }

      await api
        .put('/api/admin/v1/taxonomy/categories/order')
        .send({ ids: [categoryOne.id, categoryTwo.id] })
        .expect(200);
      await api
        .get('/api/admin/v1/taxonomy/tags')
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<Array<{ id: string }>>(response).map(
              (item) => item.id,
            ),
          ).toEqual(tagIds);
        });
      await api
        .put('/api/admin/v1/taxonomy/categories/order')
        .send({ ids: categoryIds })
        .expect(200);

      const appendedCategory = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/categories')
          .send({ name: '新增分类' })
          .expect(201),
      );
      const appendedTag = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '新增标签' })
          .expect(201),
      );
      const expectedCategoryIds = [...categoryIds, appendedCategory.id];
      const expectedTagIds = [...tagIds, appendedTag.id];

      const organized = responseBody<{
        id: string;
        tags: Array<{ id: string }>;
      }>(
        await api
          .post('/api/admin/v1/links')
          .send({
            categoryId: categoryTwo.id,
            status: 'organized',
            tagIds: [tagTwo.id, tagOne.id, tagThree.id],
            title: '排序验证链接',
            url: 'https://taxonomy-order.example/docs',
          })
          .expect(201),
      );
      expect(organized.tags.map((tag) => tag.id)).toEqual(tagIds);

      await request(server)
        .get('/api/web/v1/overview')
        .expect(200)
        .expect((response) => {
          const body = responseBody<{
            categories: Array<{ id: string }>;
            tags: Array<{ id: string }>;
          }>(response);
          expect(body.categories.map((item) => item.id)).toEqual(
            expectedCategoryIds,
          );
          expect(body.tags.map((item) => item.id)).toEqual(expectedTagIds);
        });
      await request(server)
        .get(`/api/web/v1/links/${organized.id}`)
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<{ tags: Array<{ id: string }> }>(response).tags.map(
              (tag) => tag.id,
            ),
          ).toEqual(tagIds);
        });

      const prisma = app.get(PrismaService);
      const persistedCategories = await prisma.category.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true },
      });
      const persistedTags = await prisma.tag.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: { id: true },
      });
      expect(persistedCategories.map((item) => item.id)).toEqual(
        expectedCategoryIds,
      );
      expect(persistedTags.map((item) => item.id)).toEqual(expectedTagIds);
    } finally {
      await closeApplication(app);
    }
  });

  it('creates manual links and only exposes organized records to Web', async () => {
    const app = await createTestApplication(false);
    try {
      const api = await createAdminAgent(app.getHttpServer());
      const category = await api
        .post('/api/admin/v1/taxonomy/categories')
        .send({ name: '手动分类' })
        .expect(201);
      const tag = await api
        .post('/api/admin/v1/taxonomy/tags')
        .send({ name: '手动标签' })
        .expect(201);
      const categoryId = responseBody<{ id: string }>(category).id;
      const tagId = responseBody<{ id: string }>(tag).id;

      const pending = await api
        .post('/api/admin/v1/links')
        .send({
          purpose: '稍后整理',
          status: 'pending',
          tagIds: [tagId],
          title: '手动草稿',
          url: 'https://Manual-Pending.Example/path/#section',
        })
        .expect(201);
      expect(pending.body).toMatchObject({
        category: null,
        domain: 'manual-pending.example',
        latestSource: null,
        purpose: '稍后整理',
        sourceCount: 0,
        sources: [],
        status: 'pending',
        tags: [{ id: tagId, name: '手动标签' }],
        title: '手动草稿',
        url: 'https://manual-pending.example/path',
      });
      expect(
        typeof responseBody<{ createdAt: string }>(pending).createdAt,
      ).toBe('string');
      await api
        .get('/api/web/v1/links?q=manual-pending')
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<{ pagination: { total: number } }>(response).pagination
              .total,
          ).toBe(0);
        });

      const organized = await api
        .post('/api/admin/v1/links')
        .send({
          categoryId,
          purpose: '公开查询',
          status: 'organized',
          tagIds: [tagId],
          title: '手动完成链接',
          url: 'https://manual-organized.example/docs/#intro',
        })
        .expect(201);
      const organizedBody = responseBody<{
        category: { id: string; name: string };
        id: string;
        sourceCount: number;
        status: string;
      }>(organized);
      expect(organizedBody).toMatchObject({
        category: { id: categoryId, name: '手动分类' },
        sourceCount: 0,
        status: 'organized',
      });
      await api
        .get('/api/web/v1/links?q=manual-organized')
        .expect(200)
        .expect((response) => {
          const body = responseBody<{
            items: Array<{ id: string }>;
            pagination: { total: number };
          }>(response);
          expect(body.pagination.total).toBe(1);
          expect(body.items[0]?.id).toBe(organizedBody.id);
        });

      await api
        .post('/api/admin/v1/links')
        .send({ title: '无效链接', url: 'not-a-url' })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'INVALID_URL' }),
          );
        });
      await api
        .post('/api/admin/v1/links')
        .send({
          status: 'organized',
          title: '缺少分类',
          url: 'https://missing-category.example',
        })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'LINK_INCOMPLETE' }),
          );
        });
      await api
        .post('/api/admin/v1/links')
        .send({
          categoryId: '00000000-0000-4000-8000-000000000001',
          title: '无效分类',
          url: 'https://invalid-taxonomy.example',
        })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'INVALID_TAXONOMY_REFERENCE' }),
          );
        });
      await api
        .post('/api/admin/v1/links')
        .send({
          title: '重复域名',
          url: 'https://manual-pending.example/another-page',
        })
        .expect(409)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'LINK_DOMAIN_CONFLICT' }),
          );
        });
    } finally {
      await closeApplication(app);
    }
  });

  it('replaces link tags atomically when organizing and editing', async () => {
    const app = await createTestApplication(false);
    try {
      const api = await createAdminAgent(app.getHttpServer());
      const prisma = app.get(PrismaService);
      const links = app.get(LinksService);
      const category = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/categories')
          .send({ name: '标签更新分类' })
          .expect(201),
      );
      const tagOne = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '标签一' })
          .expect(201),
      );
      const tagTwo = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '标签二' })
          .expect(201),
      );
      const link = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/links')
          .send({
            status: 'pending',
            title: '标签更新链接',
            url: 'https://tag-update.example',
          })
          .expect(201),
      );

      await api
        .patch(`/api/admin/v1/links/${link.id}`)
        .send({
          categoryId: category.id,
          status: 'organized',
          tagIds: [tagOne.id],
        })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              status: 'organized',
              tags: [expect.objectContaining({ id: tagOne.id })],
            }),
          );
        });

      for (const tagIds of [[tagTwo.id], [tagTwo.id]]) {
        await api
          .patch(`/api/admin/v1/links/${link.id}`)
          .send({ tagIds })
          .expect(200)
          .expect((response) => {
            expect(
              responseBody<{ tags: Array<{ id: string }> }>(response).tags.map(
                (tag) => tag.id,
              ),
            ).toEqual([tagTwo.id]);
          });
      }

      await api
        .patch(`/api/admin/v1/links/${link.id}`)
        .send({ purpose: '未提交标签字段' })
        .expect(200)
        .expect((response) => {
          expect(
            responseBody<{ tags: Array<{ id: string }> }>(response).tags.map(
              (tag) => tag.id,
            ),
          ).toEqual([tagTwo.id]);
        });

      await expect(
        links.update(link.id, {
          tagIds: [tagOne.id, tagOne.id],
          title: '事务失败时不应保存',
        }),
      ).rejects.toThrow();
      await expect(
        prisma.link.findUniqueOrThrow({
          include: { tags: true },
          where: { id: link.id },
        }),
      ).resolves.toMatchObject({
        tags: [{ tagId: tagTwo.id }],
        title: '标签更新链接',
      });

      await api
        .patch(`/api/admin/v1/links/${link.id}`)
        .send({ tagIds: [] })
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ status: 'organized', tags: [] }),
          );
        });
      await expect(
        prisma.linkTag.count({ where: { linkId: link.id } }),
      ).resolves.toBe(0);
    } finally {
      await closeApplication(app);
    }
  });

  it('authorizes, syncs, deduplicates, searches and archives links', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      const api = await createAdminAgent(server);
      const codeResponse = await api
        .post('/api/admin/v1/telegram/auth/code')
        .send({ phoneNumber: '+8613800000000' })
        .expect(202);
      const code = responseBody<{ challengeId: string }>(codeResponse);
      expect(codeResponse.body).not.toHaveProperty('phoneCodeHash');
      await api
        .post('/api/admin/v1/telegram/auth/code/verify')
        .send({ challengeId: code.challengeId, code: '12345' })
        .expect(200)
        .expect({ status: 'passwordRequired' });
      await api
        .post('/api/admin/v1/telegram/auth/password/verify')
        .send({ challengeId: code.challengeId, password: 'local-test-only' })
        .expect(200)
        .expect({ status: 'authorized' });

      await api.post('/api/admin/v1/telegram/chats/refresh').expect(200);
      const chats = await api.get('/api/admin/v1/telegram/chats').expect(200);
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
      const scanOptions = await api
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

      const category = await api
        .post('/api/admin/v1/taxonomy/categories')
        .send({ name: '代码仓库' })
        .expect(201);
      const tag = await api
        .post('/api/admin/v1/taxonomy/tags')
        .send({ name: '后端' })
        .expect(201);
      const unusedTag = await api
        .post('/api/admin/v1/taxonomy/tags')
        .send({ name: '未使用标签' })
        .expect(201);
      const categoryBody = responseBody<{ id: string }>(category);
      const tagBody = responseBody<{ id: string }>(tag);
      const unusedTagBody = responseBody<{ id: string }>(unusedTag);

      await api
        .post('/api/admin/v1/sync-jobs')
        .send({ rangeMode: 'allHistory' })
        .expect(400);
      await api
        .post('/api/admin/v1/sync-jobs')
        .send({ chatIds: [], rangeMode: 'allHistory' })
        .expect(400);
      await api
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
      await api
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

      const createdJob = await api
        .post('/api/admin/v1/sync-jobs')
        .send({
          chatIds: [chatId],
          defaultCategoryId: categoryBody.id,
          defaultTagIds: [tagBody.id],
          rangeMode: 'allHistory',
        })
        .expect(202);
      const job = await waitForJob(
        api,
        responseBody<{ id: string }>(createdJob).id,
      );
      expect(job).toMatchObject({
        duplicateCount: 1,
        foundCount: 3,
        newCount: 2,
        status: 'succeeded',
      });
      const partialJob = await api
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
      }>(api, responseBody<{ id: string }>(partialJob).id);
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
      const extraChat = await app.get(PrismaService).telegramChat.findFirst({
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

      const githubLink = await app.get(PrismaService).link.findUniqueOrThrow({
        where: { domain: 'github.com' },
      });
      const linkId = githubLink.id;
      await api.get('/api/web/v1/links?q=github').expect(200, {
        items: [],
        pagination: { page: 1, pageSize: 8, total: 0, totalPages: 1 },
      });
      await api.get(`/api/web/v1/links/${linkId}`).expect(404);
      await api
        .get('/api/web/v1/links?status=pending')
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'VALIDATION_ERROR' }),
          );
        });
      await api
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({
          purpose: '项目代码仓库',
          status: 'organized',
          title: 'Project repository',
        })
        .expect(200);

      const webLinks = await api.get('/api/web/v1/links?q=github').expect(200);
      const linksBody = responseBody<{
        items: [{ id: string }];
        pagination: { total: number };
      }>(webLinks);
      expect(linksBody.pagination.total).toBe(1);
      expect(linksBody.items[0].id).toBe(linkId);
      const taggedLinks = await api
        .get(`/api/web/v1/links?tagIds=${tagBody.id},${unusedTagBody.id}`)
        .expect(200);
      expect(
        responseBody<{ pagination: { total: number } }>(taggedLinks).pagination
          .total,
      ).toBe(1);
      const detail = await api.get(`/api/web/v1/links/${linkId}`).expect(200);
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
      await api
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ url: 'https://github.com/example/project?manual=1' })
        .expect(200)
        .expect((response) => {
          expect(responseBody<{ url: string }>(response).url).toBe(
            'https://github.com/example/project?manual=1',
          );
        });
      await api
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
      await api
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ url: `${docsLink.url}?conflict=1` })
        .expect(409)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'LINK_DOMAIN_CONFLICT' }),
          );
        });
      expect(detail.body).not.toHaveProperty('isFavorite');
      const adminDetail = await api
        .get(`/api/admin/v1/links/${linkId}`)
        .expect(200);
      expect(adminDetail.body).not.toHaveProperty('aiAnalysis');
      expect(adminDetail.body).not.toHaveProperty('project');
      expect(adminDetail.body).not.toHaveProperty('environment');
      const overview = await api.get('/api/web/v1/overview').expect(200);
      const overviewBody = responseBody<{
        categories: Array<{ count: number; id: string }>;
        counts: { recent: number; total: number };
        tags: Array<{ count: number; id: string }>;
      }>(overview);
      expect(overviewBody.counts).toEqual({ recent: 1, total: 1 });
      expect(overviewBody.counts).not.toHaveProperty('pending');
      expect(overviewBody.categories).toContainEqual(
        expect.objectContaining({ count: 1, id: categoryBody.id }),
      );
      expect(overviewBody.tags).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ count: 1, id: tagBody.id }),
          expect.objectContaining({ count: 0, id: unusedTagBody.id }),
        ]),
      );
      expect(overviewBody.counts).not.toHaveProperty('favorites');
      await api
        .patch(`/api/web/v1/links/${linkId}`)
        .send({ title: 'Web 不应允许编辑' })
        .expect(404);
      await api
        .patch(`/api/admin/v1/links/${linkId}`)
        .send({ isFavorite: true })
        .expect(400)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({ code: 'VALIDATION_ERROR' }),
          );
        });
      const allLinks = await api
        .get('/api/admin/v1/links?pageSize=100')
        .expect(200);
      const allLinkItems = responseBody<{ items: Array<{ id: string }> }>(
        allLinks,
      ).items;
      const otherLink = allLinkItems.find((item) => item.id !== linkId);
      if (!otherLink) {
        throw new Error('Expected a second synchronized link');
      }
      await api
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

      await api.delete(`/api/admin/v1/links/${linkId}`).expect(204);
      await api.get(`/api/web/v1/links/${linkId}`).expect(404);
      await api.post(`/api/admin/v1/links/${linkId}/restore`).expect(200);
      await api
        .delete(`/api/admin/v1/taxonomy/categories/${categoryBody.id}`)
        .expect(204);
    } finally {
      await closeApplication(app);
    }
  });

  it('deletes referenced taxonomy and cleans up link associations', async () => {
    const app = await createTestApplication(false);
    try {
      const api = await createAdminAgent(app.getHttpServer());
      const prisma = app.get(PrismaService);
      const category = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/categories')
          .send({ name: '待删除分类' })
          .expect(201),
      );
      const tag = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '待删除标签' })
          .expect(201),
      );
      const unusedTag = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/taxonomy/tags')
          .send({ name: '未引用标签' })
          .expect(201),
      );
      const activeLink = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/links')
          .send({
            categoryId: category.id,
            status: 'organized',
            tagIds: [tag.id],
            title: '活跃链接',
            url: 'https://active-taxonomy.example',
          })
          .expect(201),
      );
      const archivedLink = responseBody<{ id: string }>(
        await api
          .post('/api/admin/v1/links')
          .send({
            categoryId: category.id,
            status: 'organized',
            tagIds: [tag.id],
            title: '已归档链接',
            url: 'https://archived-taxonomy.example',
          })
          .expect(201),
      );

      await api.delete(`/api/admin/v1/links/${archivedLink.id}`).expect(204);
      const archivedAtBeforeDelete = await prisma.link.findUniqueOrThrow({
        select: { archivedAt: true },
        where: { id: archivedLink.id },
      });

      await api.delete(`/api/admin/v1/taxonomy/tags/${tag.id}`).expect(204);
      await expect(
        prisma.tag.findUnique({ where: { id: tag.id } }),
      ).resolves.toBeNull();
      await expect(
        prisma.linkTag.count({ where: { tagId: tag.id } }),
      ).resolves.toBe(0);
      await expect(
        prisma.link.findUniqueOrThrow({ where: { id: activeLink.id } }),
      ).resolves.toMatchObject({
        archivedAt: null,
        status: 'ORGANIZED',
      });

      await api
        .delete(`/api/admin/v1/taxonomy/categories/${category.id}`)
        .expect(204);
      await expect(
        prisma.category.findUnique({ where: { id: category.id } }),
      ).resolves.toBeNull();
      const persistedActiveLink = await prisma.link.findUniqueOrThrow({
        where: { id: activeLink.id },
      });
      expect(persistedActiveLink).toMatchObject({
        categoryId: null,
        status: 'PENDING',
      });
      expect(persistedActiveLink.archivedAt).toBeInstanceOf(Date);
      await expect(
        prisma.link.findUniqueOrThrow({ where: { id: archivedLink.id } }),
      ).resolves.toMatchObject({
        archivedAt: archivedAtBeforeDelete.archivedAt,
        categoryId: null,
        status: 'PENDING',
      });

      await api
        .post(`/api/admin/v1/links/${activeLink.id}/restore`)
        .expect(200)
        .expect((response) => {
          expect(response.body).toEqual(
            expect.objectContaining({
              archivedAt: null,
              category: null,
              status: 'pending',
            }),
          );
        });
      await api.get(`/api/web/v1/links/${activeLink.id}`).expect(404);

      await api
        .delete(`/api/admin/v1/taxonomy/tags/${unusedTag.id}`)
        .expect(204);
      await api
        .delete(`/api/admin/v1/taxonomy/tags/${unusedTag.id}`)
        .expect(404);
      await api
        .delete(`/api/admin/v1/taxonomy/categories/${category.id}`)
        .expect(404);
    } finally {
      await closeApplication(app);
    }
  });

  it('does not expose Swagger when disabled and rejects unknown DTO fields', async () => {
    const app = await createTestApplication(false);
    try {
      const server = app.getHttpServer();
      const api = await createAdminAgent(server);
      await api.get('/docs').expect(404);
      await api.get('/docs-json').expect(404);
      const validationResponse = await api
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
      await api
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
>(api: TestAgent, id: string): Promise<Result> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const response = await api.get(`/api/admin/v1/sync-jobs/${id}`).expect(200);
    const job = responseBody<Result>(response);
    if (!['queued', 'running'].includes(job.status)) {
      return job;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Timed out waiting for sync job');
}

async function createAdminAgent(server: App): Promise<TestAgent> {
  const api = request.agent(server);
  await api
    .post('/api/admin/v1/auth/session')
    .send({ username: testAdminUsername, password: testAdminPassword })
    .expect(200);
  return api;
}

function responseBody<T>(response: { text: string }): T {
  const parsed: unknown = JSON.parse(response.text);
  return parsed as T;
}

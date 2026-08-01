import type {
  LinkResponseDto,
  LinkSourceResponseDto,
  SyncJobResponseDto,
  TaxonomyItemResponseDto,
  TelegramChatResponseDto,
} from '@/api/types.gen';

const legacyTelegramChats = [
  {
    id: 'saved',
    name: 'Saved Messages',
    description: '我转发或临时保存的链接',
  },
  {
    id: 'dev-team',
    name: '研发协作群',
    description: '项目开发与部署讨论',
  },
  {
    id: 'product',
    name: '产品与设计',
    description: '需求、设计稿与竞品资料',
  },
  {
    id: 'ops',
    name: '运维通知',
    description: '监控、告警与故障处理',
  },
];

const legacyLinks = [
  {
    id: 'link-001',
    title: 'Atlas Web 仓库',
    url: 'https://github.com/example-org/atlas-web',
    domain: 'github.com',
    project: 'Atlas',
    purpose: '前端主仓库，查看源码、Pull Request 和发布记录。',
    environment: 'development',
    category: '代码仓库',
    tags: ['前端', 'React'],
    status: 'organized',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: 'Atlas 的前端代码迁到这个仓库，旧地址不用了。',
      messageUrl: 'https://t.me/c/1000000001/3821',
      capturedAt: '2026-07-29T09:18:00+08:00',
    },
    scanJobId: 'scan-demo-003',
    createdAt: '2026-07-29T09:18:00+08:00',
    updatedAt: '2026-07-29T10:26:00+08:00',
  },
  {
    id: 'link-002',
    title: 'Atlas 正式站',
    url: 'https://atlas.example.com',
    domain: 'atlas.example.com',
    project: 'Atlas',
    purpose: '面向客户的正式环境，用于发布后验收。',
    environment: 'production',
    category: '部署地址',
    tags: ['正式', '验收'],
    status: 'organized',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: 'v2.8 已发布，正式环境在这里。',
      messageUrl: 'https://t.me/c/1000000001/3806',
      capturedAt: '2026-07-28T17:42:00+08:00',
    },
    scanJobId: 'scan-demo-003',
    createdAt: '2026-07-28T17:42:00+08:00',
    updatedAt: '2026-07-28T18:01:00+08:00',
  },
  {
    id: 'link-003',
    title: '',
    url: 'https://preview-atlas-428.example.dev',
    domain: 'preview-atlas-428.example.dev',
    project: 'Atlas',
    purpose: '',
    environment: 'test',
    category: '',
    tags: [],
    status: 'pending',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: '新的订单详情页预览，数据还是 mock 的。',
      messageUrl: 'https://t.me/c/1000000001/3848',
      capturedAt: '2026-07-30T09:06:00+08:00',
    },
    scanJobId: 'scan-demo-004',
    createdAt: '2026-07-30T09:06:00+08:00',
    updatedAt: '2026-07-30T09:06:00+08:00',
  },
  {
    id: 'link-004',
    title: 'Northstar 接口文档',
    url: 'https://docs.example.com/northstar/api',
    domain: 'docs.example.com',
    project: 'Northstar',
    purpose: '后端 REST API 的参数说明和调试示例。',
    environment: 'unknown',
    category: '文档',
    tags: ['API', '后端'],
    status: 'organized',
    source: {
      chatId: 'saved',
      chatName: 'Saved Messages',
      messagePreview: '接口联调时看这个文档。',
      capturedAt: '2026-07-27T13:16:00+08:00',
    },
    scanJobId: 'scan-demo-002',
    createdAt: '2026-07-27T13:16:00+08:00',
    updatedAt: '2026-07-27T14:20:00+08:00',
  },
  {
    id: 'link-005',
    title: '',
    url: 'https://www.figma.com/design/example/northstar-checkout',
    domain: 'figma.com',
    project: '',
    purpose: '',
    environment: 'unknown',
    category: '设计稿',
    tags: ['待确认'],
    status: 'pending',
    source: {
      chatId: 'product',
      chatName: '产品与设计',
      messagePreview: '结算页第二版，交互说明都标在页面上了。',
      messageUrl: 'https://t.me/c/1000000002/917',
      capturedAt: '2026-07-30T08:35:00+08:00',
    },
    scanJobId: 'scan-demo-004',
    createdAt: '2026-07-30T08:35:00+08:00',
    updatedAt: '2026-07-30T08:35:00+08:00',
  },
  {
    id: 'link-006',
    title: 'Billing Grafana',
    url: 'https://grafana.example.com/d/billing-overview',
    domain: 'grafana.example.com',
    project: 'Billing',
    purpose: '查看支付成功率、回调延迟与异常订单。',
    environment: 'production',
    category: '监控面板',
    tags: ['告警', '支付'],
    status: 'organized',
    source: {
      chatId: 'ops',
      chatName: '运维通知',
      messagePreview: '支付回调延迟可以先看 Billing Overview。',
      messageUrl: 'https://t.me/c/1000000003/5120',
      capturedAt: '2026-07-25T22:10:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-25T22:10:00+08:00',
    updatedAt: '2026-07-25T22:18:00+08:00',
  },
  {
    id: 'link-007',
    title: '',
    url: 'https://linear.app/example/issue/ORB-184',
    domain: 'linear.app',
    project: 'Orbit',
    purpose: '',
    environment: 'unknown',
    category: '工单',
    tags: [],
    status: 'pending',
    source: {
      chatId: 'product',
      chatName: '产品与设计',
      messagePreview: '离线缓存的问题统一跟进这个工单。',
      messageUrl: 'https://t.me/c/1000000002/901',
      capturedAt: '2026-07-29T16:21:00+08:00',
    },
    scanJobId: 'scan-demo-003',
    createdAt: '2026-07-29T16:21:00+08:00',
    updatedAt: '2026-07-29T16:21:00+08:00',
  },
  {
    id: 'link-008',
    title: 'Orbit TestFlight 指南',
    url: 'https://docs.example.com/orbit/testflight',
    domain: 'docs.example.com',
    project: 'Orbit',
    purpose: 'iOS 测试包安装、账号授权和问题反馈说明。',
    environment: 'test',
    category: '文档',
    tags: ['iOS', '测试'],
    status: 'organized',
    source: {
      chatId: 'saved',
      chatName: 'Saved Messages',
      messagePreview: '测试同学入组时把这个发给他。',
      capturedAt: '2026-07-23T11:43:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-23T11:43:00+08:00',
    updatedAt: '2026-07-23T13:02:00+08:00',
  },
  {
    id: 'link-009',
    title: '',
    url: 'https://sentry.example.com/issues/58421',
    domain: 'sentry.example.com',
    project: '',
    purpose: '排查客户端启动阶段的偶发崩溃。',
    environment: 'production',
    category: '',
    tags: ['告警'],
    status: 'pending',
    source: {
      chatId: 'ops',
      chatName: '运维通知',
      messagePreview: '这个崩溃最近一小时出现了 17 次。',
      messageUrl: 'https://t.me/c/1000000003/5168',
      capturedAt: '2026-07-30T07:52:00+08:00',
    },
    scanJobId: 'scan-demo-004',
    createdAt: '2026-07-30T07:52:00+08:00',
    updatedAt: '2026-07-30T07:52:00+08:00',
  },
  {
    id: 'link-010',
    title: 'Billing Webhook 测试工具',
    url: 'https://tools.example.dev/webhook-tester',
    domain: 'tools.example.dev',
    project: 'Billing',
    purpose: '在开发环境重放第三方支付回调。',
    environment: 'development',
    category: '其他',
    tags: ['工具', '支付'],
    status: 'organized',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: '本地不好复现的话，用这个工具重放 webhook。',
      messageUrl: 'https://t.me/c/1000000001/3714',
      capturedAt: '2026-07-21T15:25:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-21T15:25:00+08:00',
    updatedAt: '2026-07-21T16:30:00+08:00',
  },
  {
    id: 'link-011',
    title: '',
    url: 'https://status.example.com/incidents/2026-07-29',
    domain: 'status.example.com',
    project: '',
    purpose: '',
    environment: 'production',
    category: '',
    tags: [],
    status: 'pending',
    source: {
      chatId: 'ops',
      chatName: '运维通知',
      messagePreview: '云服务商故障状态页，后续看恢复进度。',
      messageUrl: 'https://t.me/c/1000000003/5149',
      capturedAt: '2026-07-29T20:06:00+08:00',
    },
    scanJobId: 'scan-demo-003',
    createdAt: '2026-07-29T20:06:00+08:00',
    updatedAt: '2026-07-29T20:06:00+08:00',
  },
  {
    id: 'link-012',
    title: 'Atlas 发布检查清单',
    url: 'https://docs.example.com/atlas/release-checklist',
    domain: 'docs.example.com',
    project: 'Atlas',
    purpose: '正式发布前的检查步骤与回滚负责人。',
    environment: 'production',
    category: '文档',
    tags: ['发布', 'SOP'],
    status: 'organized',
    source: {
      chatId: 'saved',
      chatName: 'Saved Messages',
      messagePreview: '每次发版前按这个过一遍。',
      capturedAt: '2026-07-18T10:12:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-18T10:12:00+08:00',
    updatedAt: '2026-07-18T10:50:00+08:00',
  },
  {
    id: 'link-013',
    title: '',
    url: 'https://api-preview.example.dev/swagger',
    domain: 'api-preview.example.dev',
    project: 'Northstar',
    purpose: '临时预览环境的 Swagger 页面。',
    environment: 'test',
    category: '文档',
    tags: [],
    status: 'pending',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: '这版接口先用 preview 环境联调。',
      messageUrl: 'https://t.me/c/1000000001/3839',
      capturedAt: '2026-07-29T18:33:00+08:00',
    },
    scanJobId: 'scan-demo-003',
    createdAt: '2026-07-29T18:33:00+08:00',
    updatedAt: '2026-07-29T18:33:00+08:00',
  },
  {
    id: 'link-014',
    title: 'Northstar 竞品记录',
    url: 'https://notes.example.com/northstar-research',
    domain: 'notes.example.com',
    project: 'Northstar',
    purpose: '结算流程和会员权益的竞品截图与结论。',
    environment: 'unknown',
    category: '文档',
    tags: ['竞品', '产品'],
    status: 'organized',
    source: {
      chatId: 'product',
      chatName: '产品与设计',
      messagePreview: '我把这周看过的几个产品整理在这里了。',
      messageUrl: 'https://t.me/c/1000000002/864',
      capturedAt: '2026-07-17T19:24:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-17T19:24:00+08:00',
    updatedAt: '2026-07-18T09:07:00+08:00',
  },
  {
    id: 'link-015',
    title: 'Orbit Android 仓库',
    url: 'https://github.com/example-org/orbit-android',
    domain: 'github.com',
    project: 'Orbit',
    purpose: 'Android 客户端源码和构建流水线。',
    environment: 'development',
    category: '代码仓库',
    tags: ['Android', '客户端'],
    status: 'organized',
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: 'Android 新仓库权限已经开好了。',
      messageUrl: 'https://t.me/c/1000000001/3591',
      capturedAt: '2026-07-14T12:18:00+08:00',
    },
    scanJobId: 'scan-demo-001',
    createdAt: '2026-07-14T12:18:00+08:00',
    updatedAt: '2026-07-14T13:04:00+08:00',
  },
  {
    id: 'link-016',
    title: '',
    url: 'https://downloads.example.dev/orbit/debug',
    domain: 'downloads.example.dev',
    project: 'Orbit',
    purpose: '',
    environment: 'development',
    category: '',
    tags: ['Android'],
    status: 'pending',
    source: {
      chatId: 'saved',
      chatName: 'Saved Messages',
      messagePreview: 'debug 包下载地址，可能一周后失效。',
      capturedAt: '2026-07-30T10:11:00+08:00',
    },
    scanJobId: 'scan-demo-004',
    createdAt: '2026-07-30T10:11:00+08:00',
    updatedAt: '2026-07-30T10:11:00+08:00',
  },
];

const legacyJobs = [
  {
    id: 'scan-demo-004',
    status: 'success',
    progress: 100,
    chatNames: ['研发协作群', '产品与设计', '运维通知'],
    rangeLabel: '从上次扫描',
    startedAt: '2026-07-30T08:31:00+08:00',
    finishedAt: '2026-07-30T08:31:18+08:00',
    messageCount: 126,
    foundCount: 9,
    newCount: 4,
    duplicateCount: 5,
    durationMs: 18_400,
  },
  {
    id: 'scan-demo-003',
    status: 'success',
    progress: 100,
    chatNames: ['Saved Messages', '研发协作群'],
    rangeLabel: '最近 7 天',
    startedAt: '2026-07-29T21:04:00+08:00',
    finishedAt: '2026-07-29T21:04:13+08:00',
    messageCount: 84,
    foundCount: 7,
    newCount: 4,
    duplicateCount: 3,
    durationMs: 13_200,
  },
  {
    id: 'scan-demo-002',
    status: 'failed',
    progress: 34,
    chatNames: ['Saved Messages'],
    rangeLabel: '从上次扫描',
    startedAt: '2026-07-27T13:10:00+08:00',
    finishedAt: '2026-07-27T13:10:06+08:00',
    messageCount: 18,
    foundCount: 0,
    newCount: 0,
    duplicateCount: 0,
    durationMs: 6_100,
    error: '演示错误：Telegram 会话暂时不可用。',
  },
];

const legacyScanCandidates = [
  {
    title: 'Atlas Web 仓库',
    url: 'https://github.com/example-org/atlas-web/',
    purpose: '前端主仓库。',
    project: 'Atlas',
    category: '代码仓库',
    environment: 'development',
    tags: ['前端'],
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: '新同学再收藏一下 Atlas 仓库地址。',
      messageUrl: 'https://t.me/c/1000000001/3890',
      capturedAt: '2026-07-30T12:04:00+08:00',
    },
  },
  {
    title: 'Atlas 发布日志',
    url: 'https://docs.example.com/atlas/changelog',
    purpose: '查看每个版本的功能与修复记录。',
    project: 'Atlas',
    category: '文档',
    environment: 'production',
    tags: ['发布'],
    source: {
      chatId: 'saved',
      chatName: 'Saved Messages',
      messagePreview: 'Atlas changelog，查版本差异用。',
      capturedAt: '2026-07-30T11:48:00+08:00',
    },
  },
  {
    title: 'Northstar Staging Dashboard',
    url: 'https://staging-northstar.example.dev/dashboard',
    purpose: '预发布环境验收入口。',
    project: 'Northstar',
    category: '部署地址',
    environment: 'test',
    tags: ['测试', '验收'],
    source: {
      chatId: 'dev-team',
      chatName: '研发协作群',
      messagePreview: '这周用新的 staging dashboard 验收。',
      messageUrl: 'https://t.me/c/1000000001/3893',
      capturedAt: '2026-07-30T12:09:00+08:00',
    },
  },
  {
    title: 'Orbit 登录流程设计',
    url: 'https://www.figma.com/design/example/orbit-sign-in',
    purpose: '登录、验证码和异常状态设计稿。',
    project: 'Orbit',
    category: '设计稿',
    environment: 'unknown',
    tags: ['设计'],
    source: {
      chatId: 'product',
      chatName: '产品与设计',
      messagePreview: 'Orbit 登录流程已经补完空状态。',
      messageUrl: 'https://t.me/c/1000000002/944',
      capturedAt: '2026-07-30T12:20:00+08:00',
    },
  },
];

const projectNames = ['Atlas', 'Northstar', 'Billing', 'Orbit', 'Legacy'];
const categoryNames = [
  '代码仓库',
  '部署地址',
  '文档',
  '设计稿',
  '监控面板',
  '工单',
  '其他',
  '书签',
];
const tagNames = [
  '前端',
  '后端',
  'API',
  '正式',
  '测试',
  '发布',
  '告警',
  '待确认',
  '待阅读',
  'React',
  '验收',
  'iOS',
  '支付',
  '工具',
  'Android',
  '设计',
];

export function demoUuid(value: number): string {
  return `00000000-0000-4000-8000-${String(value).padStart(12, '0')}`;
}

function taxonomyItems(
  names: string[],
  offset: number,
): TaxonomyItemResponseDto[] {
  return names.map((name, index) => ({
    id: demoUuid(offset + index + 1),
    name,
    referenceCount: 0,
  }));
}

const projects = taxonomyItems(projectNames, 100);
const categories = taxonomyItems(categoryNames, 200);
const tags = taxonomyItems(tagNames, 300);

function taxonomyItem(
  items: TaxonomyItemResponseDto[],
  name: string,
): TaxonomyItemResponseDto | null {
  return items.find((item) => item.name === name) ?? null;
}

export const telegramChats: Array<
  TelegramChatResponseDto & { description: string }
> = legacyTelegramChats.map((chat, index) => ({
  createdAt: '2026-07-01T00:00:00.000Z',
  description: chat.description,
  id: demoUuid(400 + index + 1),
  isAvailable: true,
  isEnabled: index < 2,
  lastSyncedAt: index < 2 ? '2026-07-30T04:00:00.000Z' : null,
  lastSyncedMessageId: index < 2 ? 3800 + index : null,
  telegramPeerId: String(-1000000000 - index),
  title: chat.name,
  type: index === 0 ? 'saved' : 'group',
  updatedAt: '2026-07-30T04:00:00.000Z',
  username: null,
}));

function sourceFromLegacy(
  source: (typeof legacyLinks)[number]['source'],
  index: number,
  rawUrl: string,
): LinkSourceResponseDto {
  const chat = legacyTelegramChats.find((item) => item.id === source.chatId);
  const resolvedChat = telegramChats.find((item) => item.title === chat?.name);
  return {
    capturedAt: source.capturedAt,
    chatId: resolvedChat?.id ?? telegramChats[0]!.id,
    chatName: source.chatName,
    id: demoUuid(700 + index + 1),
    messageId: 3000 + index,
    messagePreview: source.messagePreview,
    messageText: source.messagePreview,
    messageUrl: 'messageUrl' in source ? source.messageUrl : null,
    rawUrl,
    senderName: null,
  };
}

export const links: LinkResponseDto[] = legacyLinks.map((link, index) => {
  const latestSource = sourceFromLegacy(link.source, index, link.url);
  return {
    archivedAt: null,
    category: taxonomyItem(categories, link.category),
    createdAt: link.createdAt,
    domain: link.domain,
    environment: link.environment as LinkResponseDto['environment'],
    firstDiscoveredAt: link.createdAt,
    id: demoUuid(600 + index + 1),
    isFavorite: false,
    latestSource,
    project: taxonomyItem(projects, link.project),
    purpose: link.purpose || null,
    sourceCount: 1,
    sources: [latestSource],
    status: link.status as LinkResponseDto['status'],
    tags: link.tags
      .map((name) => taxonomyItem(tags, name))
      .filter((item): item is TaxonomyItemResponseDto => item !== null),
    title: link.title,
    updatedAt: link.updatedAt,
    url: link.url,
  };
});

function withReferenceCounts(
  items: TaxonomyItemResponseDto[],
  count: (item: TaxonomyItemResponseDto) => number,
) {
  return items.map((item) => ({ ...item, referenceCount: count(item) }));
}

export const taxonomy = {
  categories: withReferenceCounts(
    categories,
    (item) => links.filter((link) => link.category?.id === item.id).length,
  ),
  projects: withReferenceCounts(
    projects,
    (item) => links.filter((link) => link.project?.id === item.id).length,
  ),
  tags: withReferenceCounts(
    tags,
    (item) =>
      links.filter((link) => link.tags.some((tag) => tag.id === item.id))
        .length,
  ),
};

export const jobs: SyncJobResponseDto[] = legacyJobs.map((job, index) => {
  const status = job.status === 'success' ? 'succeeded' : 'failed';
  return {
    chats: job.chatNames.map((chatName, chatIndex) => ({
      chatId:
        telegramChats.find((chat) => chat.title === chatName)?.id ??
        telegramChats[0]!.id,
      chatTitle: chatName,
      duplicateCount: 0,
      error: null,
      finishedAt: job.finishedAt ?? null,
      foundCount: 0,
      id: demoUuid(900 + index * 10 + chatIndex + 1),
      maxProcessedMessageId: null,
      messageCount: 0,
      newCount: 0,
      startedAt: job.startedAt,
      status: status === 'failed' ? 'failed' : 'succeeded',
    })),
    createdAt: job.startedAt,
    defaultCategoryId: null,
    defaultProjectId: null,
    defaultTagIds: [],
    duplicateCount: job.duplicateCount,
    error: job.error ?? null,
    finishedAt: job.finishedAt ?? null,
    foundCount: job.foundCount,
    id: demoUuid(500 + index + 1),
    messageCount: job.messageCount,
    newCount: job.newCount,
    progress: job.progress,
    rangeFrom: null,
    rangeMode: job.rangeLabel === '最近 7 天' ? 'last7Days' : 'sinceLast',
    rangeTo: null,
    stage: status === 'failed' ? 'reading' : 'saving',
    startedAt: job.startedAt,
    status,
    updatedAt: job.finishedAt ?? job.startedAt,
  };
});

export interface DemoScanCandidate {
  category: TaxonomyItemResponseDto | null;
  environment: LinkResponseDto['environment'];
  project: TaxonomyItemResponseDto | null;
  purpose: string;
  source: LinkSourceResponseDto;
  tags: TaxonomyItemResponseDto[];
  title: string;
  url: string;
}

export const scanCandidates: DemoScanCandidate[] = legacyScanCandidates.map(
  (candidate, index) => ({
    category: taxonomyItem(categories, candidate.category),
    environment: candidate.environment as LinkResponseDto['environment'],
    project: taxonomyItem(projects, candidate.project),
    purpose: candidate.purpose,
    source: sourceFromLegacy(candidate.source, 100 + index, candidate.url),
    tags: candidate.tags
      .map((name) => taxonomyItem(tags, name))
      .filter((item): item is TaxonomyItemResponseDto => item !== null),
    title: candidate.title,
    url: candidate.url,
  }),
);

import type {
  LinkResponseDto,
  LinkSourceResponseDto,
  PaginatedLinksResponseDto,
  TaxonomyReferenceResponseDto,
  WebOverviewResponseDto,
} from '@/api/types.gen';

const rawLinks = [
  {
    id: 'atlas-web-repository',
    title: 'Atlas Web 代码仓库',
    url: 'https://github.com/example-org/atlas-web',
    domain: 'github.com',
    purpose: 'Web 主站的 React 源码和发布工作流',
    status: 'organized',
    category: 'repository',
    tags: ['React', '前端', '主仓库'],
    source: {
      chatName: '我的收藏',
      messagePreview: 'Atlas 的前端仓库，部署配置也在这里。',
      capturedAt: '2026-07-30T09:32:00+08:00',
      messageUrl: 'https://t.me/c/1000000000/114',
    },
  },
  {
    id: 'atlas-production',
    title: 'Atlas 正式站',
    url: 'https://atlas.example.com',
    domain: 'atlas.example.com',
    purpose: '客户正在使用的正式环境',
    status: 'organized',
    category: 'deployment',
    tags: ['线上', '客户可见'],
    source: {
      chatName: 'Atlas 项目组',
      messagePreview: '正式环境已经切到新域名，后续都用这个地址。',
      capturedAt: '2026-07-30T08:54:00+08:00',
    },
  },
  {
    id: 'atlas-preview',
    title: 'Atlas 登录改版预览',
    url: 'https://atlas-login-preview.example.com',
    domain: 'atlas-login-preview.example.com',
    purpose: '登录页改版验收地址，本周五前有效',
    status: 'organized',
    category: 'deployment',
    tags: ['预览', '登录页', '验收'],
    source: {
      chatName: 'Atlas 项目组',
      messagePreview: '登录改版的 preview，手机端也一起看一下。',
      capturedAt: '2026-07-29T18:16:00+08:00',
      messageUrl: 'https://t.me/c/1000000001/285',
    },
  },
  {
    id: 'atlas-figma',
    title: 'Atlas Design System',
    url: 'https://www.figma.com/design/example-atlas-system',
    domain: 'figma.com',
    purpose: '组件规范、页面模板与交互说明',
    status: 'organized',
    category: 'design',
    tags: ['Figma', '组件库', '规范'],
    source: {
      chatName: '设计协作',
      messagePreview: '最新的 design system 在这个文件，旧文件不用了。',
      capturedAt: '2026-07-28T15:40:00+08:00',
    },
  },
  {
    id: 'northstar-api-docs',
    title: 'Northstar API 文档',
    url: 'https://api-test.example.com/docs',
    domain: 'api-test.example.com',
    purpose: '测试环境 OpenAPI 文档',
    status: 'organized',
    category: 'documentation',
    tags: ['OpenAPI', '后端', '联调'],
    source: {
      chatName: 'Northstar 开发',
      messagePreview: '联调看这里，token 还是用测试账号申请。',
      capturedAt: '2026-07-28T11:24:00+08:00',
      messageUrl: 'https://t.me/c/1000000002/331',
    },
  },
  {
    id: 'northstar-sentry',
    title: 'Northstar Sentry',
    url: 'https://sentry.io/organizations/example-org/issues/',
    domain: 'sentry.io',
    purpose: '正式环境前后端错误追踪',
    status: 'organized',
    category: 'monitoring',
    tags: ['Sentry', '告警', '错误追踪'],
    source: {
      chatName: 'Northstar 运维',
      messagePreview: '线上报错先来这个项目看，已经按服务拆好了。',
      capturedAt: '2026-07-27T22:08:00+08:00',
    },
  },
  {
    id: 'northstar-login-issue',
    title: '登录回跳参数丢失',
    url: 'https://linear.app/example/issue/NOR-248',
    domain: 'linear.app',
    purpose: '记录 OAuth 登录后的 redirect 问题',
    status: 'organized',
    category: 'issue',
    tags: ['OAuth', '高优先级'],
    source: {
      chatName: 'Northstar 开发',
      messagePreview: '这个线上问题先记一下，复现步骤写在 Linear 里。',
      capturedAt: '2026-07-26T16:46:00+08:00',
    },
  },
  {
    id: 'northstar-grafana',
    title: 'Northstar 服务监控',
    url: 'https://grafana.example.com/d/northstar-overview',
    domain: 'grafana.example.com',
    purpose: 'API 延迟、错误率与队列积压看板',
    status: 'organized',
    category: 'monitoring',
    tags: ['Grafana', '性能', '服务端'],
    source: {
      chatName: 'Northstar 运维',
      messagePreview: '新的 overview dashboard，常用指标都放到第一页了。',
      capturedAt: '2026-07-25T10:12:00+08:00',
    },
  },
  {
    id: 'orbit-storybook',
    title: 'Orbit Storybook',
    url: 'https://storybook-orbit.example.com',
    domain: 'storybook-orbit.example.com',
    purpose: '开发中的公共 UI 组件预览',
    status: 'organized',
    category: 'documentation',
    tags: ['Storybook', 'UI', '组件'],
    source: {
      chatName: '前端交流',
      messagePreview: 'Orbit 的 Storybook 链接，组件状态基本都补齐了。',
      capturedAt: '2026-07-24T19:20:00+08:00',
    },
  },
  {
    id: 'orbit-package',
    title: 'Orbit UI Package',
    url: 'https://www.npmjs.com/package/@example/orbit-ui',
    domain: 'npmjs.com',
    purpose: '团队 UI 包的版本与安装说明',
    status: 'organized',
    category: 'documentation',
    tags: ['npm', 'UI', '包管理'],
    source: {
      chatName: '前端交流',
      messagePreview: '2.4.0 已经发了，升级说明看 npm 页面。',
      capturedAt: '2026-07-22T14:05:00+08:00',
    },
  },
  {
    id: 'billing-webhook-docs',
    title: 'Billing Webhook 说明',
    url: 'https://docs.example.com/billing/webhooks',
    domain: 'docs.example.com',
    purpose: '支付回调事件和验签规则',
    status: 'organized',
    category: 'documentation',
    tags: ['支付', 'Webhook', '后端'],
    source: {
      chatName: '支付接入',
      messagePreview: '回调事件列表在这里，注意重试和幂等那两节。',
      capturedAt: '2026-07-20T09:18:00+08:00',
    },
  },
  {
    id: 'billing-postman',
    title: 'Billing Postman Collection',
    url: 'https://www.postman.com/example/workspace/billing',
    domain: 'postman.com',
    purpose: '支付接口的测试请求集合',
    status: 'organized',
    category: 'documentation',
    tags: ['Postman', '接口测试'],
    source: {
      chatName: '支付接入',
      messagePreview: '我把沙箱环境变量也放进 collection 了。',
      capturedAt: '2026-07-18T17:34:00+08:00',
    },
  },
  {
    id: 'cloudflare-dashboard',
    title: '域名与缓存控制台',
    url: 'https://dash.cloudflare.com/example-account',
    domain: 'dash.cloudflare.com',
    purpose: null,
    status: 'pending',
    category: 'other',
    tags: ['Cloudflare'],
    source: {
      chatName: '我的收藏',
      messagePreview: '这个链接后面整理一下，好像是域名设置。',
      capturedAt: '2026-07-17T21:02:00+08:00',
    },
  },
  {
    id: 'mobile-release-checklist',
    title: '移动端发布检查清单',
    url: 'https://www.notion.so/example/mobile-release-checklist',
    domain: 'notion.so',
    purpose: '发布前需要逐项确认的检查表',
    status: 'pending',
    category: 'documentation',
    tags: ['发布', 'Checklist'],
    source: {
      chatName: '开发备忘',
      messagePreview: '别人分享的发布 checklist，有空归到对应项目。',
      capturedAt: '2026-07-15T12:30:00+08:00',
    },
  },
  {
    id: 'database-console',
    title: '数据库控制台',
    url: 'https://app.supabase.com/project/example',
    domain: 'app.supabase.com',
    purpose: null,
    status: 'pending',
    category: 'monitoring',
    tags: ['数据库', 'Supabase'],
    source: {
      chatName: '临时链接',
      messagePreview: '测试数据库的入口，具体属于哪个项目忘了。',
      capturedAt: '2026-07-12T20:44:00+08:00',
    },
  },
  {
    id: 'unknown-github-pr',
    title: '',
    url: 'https://github.com/example-org/example/pull/42',
    domain: 'github.com',
    purpose: null,
    status: 'pending',
    category: 'issue',
    tags: ['GitHub', 'Code Review'],
    source: {
      chatName: '开发备忘',
      messagePreview: '先存一下这个 PR，晚点确认是哪边的改动。',
      capturedAt: '2026-07-10T16:22:00+08:00',
    },
  },
] as const;

const categoryNames = {
  repository: '代码仓库',
  deployment: '部署地址',
  documentation: '文档',
  design: '设计稿',
  monitoring: '监控',
  issue: '工单',
  other: '其他',
} as const;

function demoUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function taxonomyReference(
  id: number,
  name: string,
): TaxonomyReferenceResponseDto {
  return { id: demoUuid(id), name };
}

const categoryReferences = Object.entries(categoryNames).map(
  ([key, name], index) => ({ key, ...taxonomyReference(201 + index, name) }),
);
const tagNames = [...new Set(rawLinks.flatMap((link) => link.tags))];
const tagReferences = tagNames.map((name, index) =>
  taxonomyReference(301 + index, name),
);
const chatNames = [...new Set(rawLinks.map((link) => link.source.chatName))];

function findReference(
  references: readonly TaxonomyReferenceResponseDto[],
  name: string,
): TaxonomyReferenceResponseDto {
  const reference = references.find((item) => item.name === name);
  if (!reference) {
    throw new Error(`Missing demo taxonomy reference: ${name}`);
  }
  return reference;
}

const detailedLinks: LinkResponseDto[] = rawLinks.map((link, index) => {
  const withoutSource = link.id === 'unknown-github-pr';
  const source: LinkSourceResponseDto = {
    id: demoUuid(701 + index),
    chatId: demoUuid(501 + chatNames.indexOf(link.source.chatName)),
    chatName: link.source.chatName,
    messageId: 1000 + index,
    messagePreview: link.source.messagePreview,
    messageText: link.source.messagePreview,
    messageUrl: 'messageUrl' in link.source ? link.source.messageUrl : null,
    rawUrl: link.url,
    senderName: index % 3 === 0 ? 'Jun' : null,
    capturedAt: link.source.capturedAt,
  };
  const category =
    link.id === 'cloudflare-dashboard'
      ? null
      : (categoryReferences.find((item) => item.key === link.category) ?? null);
  const capturedAt = link.source.capturedAt;

  return {
    id: demoUuid(601 + index),
    title: link.title,
    url: link.url,
    domain: link.domain,
    status: link.status,
    category: category ? { id: category.id, name: category.name } : null,
    tags: link.tags.map((tag) => findReference(tagReferences, tag)),
    purpose: link.purpose,
    sourceCount: withoutSource ? 0 : 1,
    latestSource: withoutSource ? null : source,
    sources: withoutSource ? [] : [source],
    firstDiscoveredAt: capturedAt,
    createdAt: capturedAt,
    updatedAt: capturedAt,
    archivedAt: null,
  };
});

export const linkFixtures: readonly LinkResponseDto[] = detailedLinks.map(
  (link) => ({ ...link, sources: undefined }),
);

export const linkDetailFixtures = new Map(
  detailedLinks.map((link) => [link.id, link] as const),
);

function categoryCounts(): Array<{ count: number; id: string; name: string }> {
  return categoryReferences
    .map(({ id, name }) => ({
      count: detailedLinks.filter((link) => link.category?.id === id).length,
      id,
      name,
    }))
    .filter((item) => item.count > 0);
}

const newestCreatedAt = Math.max(
  ...detailedLinks.map((link) => Date.parse(link.createdAt)),
);
export const demoRecentSince = new Date(
  newestCreatedAt - 7 * 24 * 60 * 60 * 1000,
).toISOString();

export const webOverviewFixture: WebOverviewResponseDto = {
  categories: categoryCounts(),
  counts: {
    pending: detailedLinks.filter((link) => link.status === 'pending').length,
    recent: detailedLinks.filter(
      (link) => Date.parse(link.createdAt) >= Date.parse(demoRecentSince),
    ).length,
    total: detailedLinks.length,
  },
  latestSync: {
    finishedAt: '2026-07-30T09:42:00+08:00',
    status: 'succeeded',
  },
};

export function createPaginatedLinksFixture(
  items: readonly LinkResponseDto[],
  page: number,
  pageSize: number,
): PaginatedLinksResponseDto {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  return {
    items: items.slice((safePage - 1) * pageSize, safePage * pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total: items.length,
      totalPages,
    },
  };
}

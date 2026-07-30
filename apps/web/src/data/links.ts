export type LinkEnvironment = 'production' | 'test' | 'development' | 'unknown';

export type OrganizationStatus = 'pending' | 'organized';

export type LinkCategory =
  | 'repository'
  | 'deployment'
  | 'documentation'
  | 'design'
  | 'monitoring'
  | 'issue'
  | 'other';

export interface TelegramSourceMock {
  chatName: string;
  messagePreview: string;
  capturedAt: string;
  messageUrl?: string;
}

export interface TelegramLinkMock {
  id: string;
  title: string;
  url: string;
  domain: string;
  project: string | null;
  purpose: string | null;
  environment: LinkEnvironment;
  status: OrganizationStatus;
  category: LinkCategory;
  tags: readonly string[];
  source: TelegramSourceMock;
  isFavorite: boolean;
}

export const environmentLabels: Record<LinkEnvironment, string> = {
  production: '正式',
  test: '测试',
  development: '开发',
  unknown: '未知',
};

export const statusLabels: Record<OrganizationStatus, string> = {
  pending: '待整理',
  organized: '已整理',
};

export const categoryLabels: Record<LinkCategory, string> = {
  repository: '代码仓库',
  deployment: '部署地址',
  documentation: '文档',
  design: '设计稿',
  monitoring: '监控',
  issue: '工单',
  other: '其他',
};

export const linkCategories = Object.keys(
  categoryLabels,
) as readonly LinkCategory[];

export const telegramLinks: readonly TelegramLinkMock[] = [
  {
    id: 'atlas-web-repository',
    title: 'Atlas Web 代码仓库',
    url: 'https://github.com/example-org/atlas-web',
    domain: 'github.com',
    project: 'Atlas',
    purpose: 'Web 主站的 React 源码和发布工作流',
    environment: 'development',
    status: 'organized',
    category: 'repository',
    tags: ['React', '前端', '主仓库'],
    source: {
      chatName: '我的收藏',
      messagePreview: 'Atlas 的前端仓库，部署配置也在这里。',
      capturedAt: '2026-07-30T09:32:00+08:00',
      messageUrl: 'https://t.me/c/1000000000/114',
    },
    isFavorite: true,
  },
  {
    id: 'atlas-production',
    title: 'Atlas 正式站',
    url: 'https://atlas.example.com',
    domain: 'atlas.example.com',
    project: 'Atlas',
    purpose: '客户正在使用的正式环境',
    environment: 'production',
    status: 'organized',
    category: 'deployment',
    tags: ['线上', '客户可见'],
    source: {
      chatName: 'Atlas 项目组',
      messagePreview: '正式环境已经切到新域名，后续都用这个地址。',
      capturedAt: '2026-07-30T08:54:00+08:00',
    },
    isFavorite: true,
  },
  {
    id: 'atlas-preview',
    title: 'Atlas 登录改版预览',
    url: 'https://atlas-login-preview.example.com',
    domain: 'atlas-login-preview.example.com',
    project: 'Atlas',
    purpose: '登录页改版验收地址，本周五前有效',
    environment: 'test',
    status: 'organized',
    category: 'deployment',
    tags: ['预览', '登录页', '验收'],
    source: {
      chatName: 'Atlas 项目组',
      messagePreview: '登录改版的 preview，手机端也一起看一下。',
      capturedAt: '2026-07-29T18:16:00+08:00',
      messageUrl: 'https://t.me/c/1000000001/285',
    },
    isFavorite: false,
  },
  {
    id: 'atlas-figma',
    title: 'Atlas Design System',
    url: 'https://www.figma.com/design/example-atlas-system',
    domain: 'figma.com',
    project: 'Atlas',
    purpose: '组件规范、页面模板与交互说明',
    environment: 'unknown',
    status: 'organized',
    category: 'design',
    tags: ['Figma', '组件库', '规范'],
    source: {
      chatName: '设计协作',
      messagePreview: '最新的 design system 在这个文件，旧文件不用了。',
      capturedAt: '2026-07-28T15:40:00+08:00',
    },
    isFavorite: true,
  },
  {
    id: 'northstar-api-docs',
    title: 'Northstar API 文档',
    url: 'https://api-test.example.com/docs',
    domain: 'api-test.example.com',
    project: 'Northstar',
    purpose: '测试环境 OpenAPI 文档',
    environment: 'test',
    status: 'organized',
    category: 'documentation',
    tags: ['OpenAPI', '后端', '联调'],
    source: {
      chatName: 'Northstar 开发',
      messagePreview: '联调看这里，token 还是用测试账号申请。',
      capturedAt: '2026-07-28T11:24:00+08:00',
      messageUrl: 'https://t.me/c/1000000002/331',
    },
    isFavorite: true,
  },
  {
    id: 'northstar-sentry',
    title: 'Northstar Sentry',
    url: 'https://sentry.io/organizations/example-org/issues/',
    domain: 'sentry.io',
    project: 'Northstar',
    purpose: '正式环境前后端错误追踪',
    environment: 'production',
    status: 'organized',
    category: 'monitoring',
    tags: ['Sentry', '告警', '错误追踪'],
    source: {
      chatName: 'Northstar 运维',
      messagePreview: '线上报错先来这个项目看，已经按服务拆好了。',
      capturedAt: '2026-07-27T22:08:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'northstar-login-issue',
    title: '登录回跳参数丢失',
    url: 'https://linear.app/example/issue/NOR-248',
    domain: 'linear.app',
    project: 'Northstar',
    purpose: '记录 OAuth 登录后的 redirect 问题',
    environment: 'production',
    status: 'organized',
    category: 'issue',
    tags: ['OAuth', '高优先级'],
    source: {
      chatName: 'Northstar 开发',
      messagePreview: '这个线上问题先记一下，复现步骤写在 Linear 里。',
      capturedAt: '2026-07-26T16:46:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'northstar-grafana',
    title: 'Northstar 服务监控',
    url: 'https://grafana.example.com/d/northstar-overview',
    domain: 'grafana.example.com',
    project: 'Northstar',
    purpose: 'API 延迟、错误率与队列积压看板',
    environment: 'production',
    status: 'organized',
    category: 'monitoring',
    tags: ['Grafana', '性能', '服务端'],
    source: {
      chatName: 'Northstar 运维',
      messagePreview: '新的 overview dashboard，常用指标都放到第一页了。',
      capturedAt: '2026-07-25T10:12:00+08:00',
    },
    isFavorite: true,
  },
  {
    id: 'orbit-storybook',
    title: 'Orbit Storybook',
    url: 'https://storybook-orbit.example.com',
    domain: 'storybook-orbit.example.com',
    project: 'Orbit',
    purpose: '开发中的公共 UI 组件预览',
    environment: 'development',
    status: 'organized',
    category: 'documentation',
    tags: ['Storybook', 'UI', '组件'],
    source: {
      chatName: '前端交流',
      messagePreview: 'Orbit 的 Storybook 链接，组件状态基本都补齐了。',
      capturedAt: '2026-07-24T19:20:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'orbit-package',
    title: 'Orbit UI Package',
    url: 'https://www.npmjs.com/package/@example/orbit-ui',
    domain: 'npmjs.com',
    project: 'Orbit',
    purpose: '团队 UI 包的版本与安装说明',
    environment: 'production',
    status: 'organized',
    category: 'documentation',
    tags: ['npm', 'UI', '包管理'],
    source: {
      chatName: '前端交流',
      messagePreview: '2.4.0 已经发了，升级说明看 npm 页面。',
      capturedAt: '2026-07-22T14:05:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'billing-webhook-docs',
    title: 'Billing Webhook 说明',
    url: 'https://docs.example.com/billing/webhooks',
    domain: 'docs.example.com',
    project: 'Billing',
    purpose: '支付回调事件和验签规则',
    environment: 'production',
    status: 'organized',
    category: 'documentation',
    tags: ['支付', 'Webhook', '后端'],
    source: {
      chatName: '支付接入',
      messagePreview: '回调事件列表在这里，注意重试和幂等那两节。',
      capturedAt: '2026-07-20T09:18:00+08:00',
    },
    isFavorite: true,
  },
  {
    id: 'billing-postman',
    title: 'Billing Postman Collection',
    url: 'https://www.postman.com/example/workspace/billing',
    domain: 'postman.com',
    project: 'Billing',
    purpose: '支付接口的测试请求集合',
    environment: 'test',
    status: 'organized',
    category: 'documentation',
    tags: ['Postman', '接口测试'],
    source: {
      chatName: '支付接入',
      messagePreview: '我把沙箱环境变量也放进 collection 了。',
      capturedAt: '2026-07-18T17:34:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'cloudflare-dashboard',
    title: '域名与缓存控制台',
    url: 'https://dash.cloudflare.com/example-account',
    domain: 'dash.cloudflare.com',
    project: null,
    purpose: null,
    environment: 'unknown',
    status: 'pending',
    category: 'other',
    tags: ['Cloudflare'],
    source: {
      chatName: '我的收藏',
      messagePreview: '这个链接后面整理一下，好像是域名设置。',
      capturedAt: '2026-07-17T21:02:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'mobile-release-checklist',
    title: '移动端发布检查清单',
    url: 'https://www.notion.so/example/mobile-release-checklist',
    domain: 'notion.so',
    project: null,
    purpose: '发布前需要逐项确认的检查表',
    environment: 'unknown',
    status: 'pending',
    category: 'documentation',
    tags: ['发布', 'Checklist'],
    source: {
      chatName: '开发备忘',
      messagePreview: '别人分享的发布 checklist，有空归到对应项目。',
      capturedAt: '2026-07-15T12:30:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'database-console',
    title: '数据库控制台',
    url: 'https://app.supabase.com/project/example',
    domain: 'app.supabase.com',
    project: null,
    purpose: null,
    environment: 'test',
    status: 'pending',
    category: 'monitoring',
    tags: ['数据库', 'Supabase'],
    source: {
      chatName: '临时链接',
      messagePreview: '测试数据库的入口，具体属于哪个项目忘了。',
      capturedAt: '2026-07-12T20:44:00+08:00',
    },
    isFavorite: false,
  },
  {
    id: 'unknown-github-pr',
    title: '需要复查的 Pull Request',
    url: 'https://github.com/example-org/example/pull/42',
    domain: 'github.com',
    project: null,
    purpose: null,
    environment: 'development',
    status: 'pending',
    category: 'issue',
    tags: ['GitHub', 'Code Review'],
    source: {
      chatName: '开发备忘',
      messagePreview: '先存一下这个 PR，晚点确认是哪边的改动。',
      capturedAt: '2026-07-10T16:22:00+08:00',
    },
    isFavorite: false,
  },
];

const newestCapturedAt = Math.max(
  ...telegramLinks.map((link) => Date.parse(link.source.capturedAt)),
);
const recentWindow = 7 * 24 * 60 * 60 * 1000;

export function isRecentLink(link: TelegramLinkMock) {
  return newestCapturedAt - Date.parse(link.source.capturedAt) <= recentWindow;
}

const capturedAtFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCapturedAt(capturedAt: string) {
  return capturedAtFormatter.format(new Date(capturedAt));
}

# Telegram Links

一个用于从个人 Telegram 聊天中收集、整理和检索网页链接的
monorepo。它帮助用户按分类和标签整理链接，并保留完整的 Telegram 来源上下文。

项目由三个应用协作完成：

| 应用     | 职责                                               |
| -------- | -------------------------------------------------- |
| `web`    | 个人链接工作台，负责搜索、筛选、查看和复制链接     |
| `admin`  | 触发消息检索、识别网页链接，并维护标签和分类       |
| `server` | 提供后端接口，并将检索结果和整理信息持久化到数据库 |

Web 和 Admin 均已对接 Server。Admin 可授权 Telegram 个人账号、选择聊天来源、
扫描链接并使用分类和标签整理；Web 只读展示已整理链接及其完整来源。数据持久化到
PostgreSQL。

## 目录

```text
apps/
  admin/   管理端，React + Vite
  server/  服务端，NestJS
  web/     展示端，React + Vite
packages/
  eslint-config/      共享 ESLint 配置
  typescript-config/  共享 TypeScript 配置
  ui/                 共享 shadcn/ui 组件与主题
```

## 开始开发

环境要求：

- Node.js 20.19 或更高版本
- pnpm 11

```bash
corepack enable
pnpm install
```

Server 使用独立的 PostgreSQL 17 容器，宿主机默认端口为 `5433`。首次启动先准备
本地环境：

```bash
cp apps/server/.env.example apps/server/.env
# 在 apps/server/.env 中填写 Telegram API 凭据和会话加密密钥
pnpm db:up
pnpm dev
```

`pnpm dev` 会启动 Web、Admin 和 Server。也可以使用
`pnpm --filter <web|admin|server> dev` 单独启动应用。

启动后可访问：

- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>

接口按 `/api/web/v1` 和 `/api/admin/v1` 分区。更多环境变量、授权和同步说明见
[Server README](./apps/server/README.md)。

## 免费部署

生产部署使用单个 Koyeb Web Service 承载 Caddy、Web、Admin 和 Server，数据库使用
Neon PostgreSQL。完整的账号准备、环境变量、数据迁移和验收步骤见
[Koyeb + Neon 部署指南](./docs/deployment-koyeb-neon.md)。

## 常用命令

```bash
pnpm build           # 构建所有 workspace
pnpm lint            # 检查代码，warning 也会失败
pnpm lint:fix        # 自动修复 ESLint 问题
pnpm format          # 格式化仓库文件
pnpm format:check    # 检查文件格式
pnpm check-types     # 执行可用的类型检查任务
pnpm db:up           # 启动本地 PostgreSQL
pnpm db:down         # 停止容器并保留数据卷
pnpm db:logs         # 持续查看 PostgreSQL 日志
pnpm db:ps           # 查看数据库容器状态
```

服务端测试：

```bash
pnpm --filter server test
pnpm --filter server test:e2e
```

E2E 测试需要先启动本地 PostgreSQL。

## 参与贡献

提交代码前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

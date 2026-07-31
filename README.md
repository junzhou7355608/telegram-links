# Telegram Links

一个用于从个人 Telegram 聊天中收集、整理和检索网页链接的
monorepo。它帮助用户快速确认链接属于哪个项目、用于什么场景，以及对应正式、测试还是开发环境。

项目由三个应用协作完成：

| 应用     | 职责                                               |
| -------- | -------------------------------------------------- |
| `web`    | 个人链接工作台，负责搜索、筛选、查看和复制链接     |
| `admin`  | 触发消息检索、识别网页链接，并维护标签和分类       |
| `server` | 提供后端接口，并将检索结果和整理信息持久化到数据库 |

Web 当前提供个人链接检索原型；Admin 提供本地可持久化的扫描与整理原型。
两端都使用演示数据，不会请求 Server。Server 已接入 Prisma、PostgreSQL 和
Swagger，但尚无业务模型与接口。真实 Telegram 扫描及前后端联调尚未实现。

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
- pnpm 9

```bash
corepack enable
pnpm install
```

启动 Web 和 Admin：

```bash
pnpm dev
```

Server 使用独立的 PostgreSQL 17 容器，宿主机默认端口为 `5433`：

```bash
cp apps/server/.env.example apps/server/.env
pnpm db:up
pnpm --filter server start:dev
```

启动后可访问：

- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>

当前 OpenAPI 文档不包含业务路径。更多说明见
[Server README](./apps/server/README.md)。

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

# Server

Telegram Links 的 NestJS 服务端基础工程。当前已接入 Prisma 7、PostgreSQL
17 和 Swagger，预留 `/api` 前缀，但尚未创建业务模型、迁移、DTO 或接口。

## 本地启动

环境要求见根目录 [README](../../README.md)，并需要 Docker。

```bash
cp apps/server/.env.example apps/server/.env
pnpm db:up
pnpm --filter server start:dev
```

默认地址：

- Server：<http://localhost:3000>
- Swagger UI：<http://localhost:3000/docs>
- OpenAPI JSON：<http://localhost:3000/docs-json>
- PostgreSQL：`localhost:5433`

只有 `SWAGGER_ENABLED=true` 时才会暴露 Swagger。当前没有业务路由，因此
`/`、`/api` 均返回 404，OpenAPI 文档的 `paths` 为空。

## Prisma

Prisma schema 位于 `prisma/schema.prisma`，生成的客户端写入
`src/generated/prisma`。该目录是生成物，不提交到 Git。

```bash
pnpm --filter server prisma:generate
pnpm --filter server prisma:validate
pnpm --filter server prisma:migrate
pnpm --filter server prisma:studio
```

当前 schema 没有业务 model，也没有 migration。加入第一个业务模型后再运行
`prisma:migrate` 创建首次迁移。

构建、开发启动、类型检查和测试会在执行前自动生成 Prisma Client。

## 检查与测试

```bash
pnpm --filter server lint
pnpm --filter server check-types
pnpm --filter server build
pnpm --filter server test
pnpm --filter server test:e2e
```

单元测试不连接数据库；E2E 测试需要先运行 `pnpm db:up`。结束后可运行
`pnpm db:down` 停止容器，数据卷会被保留。

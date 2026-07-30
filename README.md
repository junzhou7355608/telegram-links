# Telegram Links

一个用于收集、整理和检索 Telegram 链接的 monorepo。

项目目前处于基础搭建阶段，业务功能尚未实现。计划由三个应用协作完成：

| 应用     | 职责                                           |
| -------- | ---------------------------------------------- |
| `web`    | 展示 Telegram 链接，并提供搜索、复制等公开功能 |
| `admin`  | 触发消息检索、识别链接，并维护标签和分类       |
| `server` | 提供后端接口，并将检索结果持久化到数据库       |

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

启动 Server：

```bash
pnpm --filter server start:dev
```

## 常用命令

```bash
pnpm build          # 构建所有 workspace
pnpm lint           # 检查代码，warning 也会失败
pnpm lint:fix       # 自动修复 ESLint 问题
pnpm format         # 格式化仓库文件
pnpm format:check   # 检查文件格式
pnpm check-types    # 执行可用的类型检查任务
```

服务端测试：

```bash
pnpm --filter server test
pnpm --filter server test:e2e
```

## 参与贡献

提交代码前请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

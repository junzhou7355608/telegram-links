# syntax=docker/dockerfile:1

FROM node:24-alpine AS build

WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/typescript-config/package.json packages/typescript-config/package.json
COPY packages/ui/package.json packages/ui/package.json

RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
  pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter web build \
  && pnpm --filter admin build \
  && pnpm --filter server build
RUN pnpm --filter server deploy --legacy --prod /runtime/server
RUN cp -R apps/server/dist apps/server/prisma apps/server/prisma.config.ts /runtime/server/

FROM caddy:2.10.2-alpine AS caddy

FROM node:24-alpine AS runtime

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=build /runtime/server ./
COPY --from=build /workspace/apps/web/dist /srv/web
COPY --from=build /workspace/apps/admin/dist /srv/admin
COPY --from=build /workspace/deploy/Caddyfile /app/deploy/Caddyfile
COPY --from=build /workspace/deploy/entrypoint.sh /app/deploy/entrypoint.sh

RUN chmod 755 /app/deploy/entrypoint.sh

ENV HOST=127.0.0.1 \
  NODE_ENV=production \
  PORT=3000 \
  PUBLIC_PORT=8000 \
  SWAGGER_ENABLED=false

EXPOSE 8000

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/app/deploy/entrypoint.sh"]

# Build context must be the repo root, e.g.:
#   docker build -f services/api/Dockerfile .
# Unlike @reality-shop/web, @reality-shop/api has workspace-package
# dependencies, so turbo prune's output legitimately includes packages/config
# and packages/shared-types alongside services/api.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS pruner
COPY . .
RUN pnpm install --filter . --frozen-lockfile
RUN pnpm exec turbo prune @reality-shop/api --docker

FROM base AS builder

# Manifests first — this layer only invalidates when a dependency
# actually changes, not on every source edit.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# prisma.config.ts eagerly resolves DATABASE_URL even for `generate`
# (never connects, just needs it set) — no t3-env-style skip escape
# hatch exists for Prisma's own config loader, so a placeholder is the
# correct approach here, not a workaround.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Same Turbo env-stripping behavior as apps/web's Dockerfile — verified
# there, applies identically here. --env-mode=loose scopes it to this
# one invocation rather than turbo.json (which would affect local dev).
RUN pnpm exec turbo build --filter=@reality-shop/api --env-mode=loose

# Separate from the builder stage on purpose: a --prod install here
# never has devDependencies (@nestjs/cli, typescript, vitest, prisma
# CLI, ...) installed in the first place, rather than installing them
# in `builder` and trying to strip them out afterward.
FROM base AS runtime-deps
COPY --from=pruner /app/out/json/ .
RUN pnpm install --prod --frozen-lockfile

FROM node:22-slim AS runtime
WORKDIR /app
USER node

# pnpm's workspace node_modules is symlink-based (root .pnpm store +
# per-package symlinks) — copying the whole runtime-deps tree together
# keeps those symlinks valid, rather than trying to cherry-pick
# individual node_modules subpaths and risking a broken link target.
COPY --from=runtime-deps --chown=node:node /app/ ./

# @reality-shop/shared-types now exports a runtime value (AUTH_COOKIE), so the
# API's compiled CommonJS output requires its built JavaScript at startup. The
# runtime-deps stage contains the pnpm workspace symlink and package manifest;
# complete that package with the build artifact from the builder stage.
COPY --from=builder --chown=node:node /app/packages/shared-types/dist ./packages/shared-types/dist

# dist/ already contains the compiled generated Prisma client
# (dist/generated/prisma) as part of the normal build output — verified
# via the MODULE_NOT_FOUND error earlier in this session, which showed
# dist/prisma/prisma.service.js resolving '../generated/prisma/client'
# relative to itself. No separate copy of src/generated/prisma needed.
COPY --from=builder --chown=node:node /app/services/api/dist ./services/api/dist

WORKDIR /app/services/api
# Runtime stage only — set earlier it would strip the build's devDependencies.
ENV NODE_ENV=production
ENV PORT=7676
EXPOSE 7676

CMD ["node", "dist/main.js"]

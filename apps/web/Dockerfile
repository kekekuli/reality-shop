# Build context must be the repo root, e.g.:
#   docker build -f apps/web/Dockerfile .
# turbo prune needs to see the whole workspace graph even though
# @reality-shop/web itself has no internal workspace-package
# dependencies today (verified: out/full only contains apps/web) — it's
# still how prune resolves the correct lockfile subset for this target.

FROM node:22-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS pruner
COPY . .
RUN pnpm install --filter . --frozen-lockfile
RUN pnpm exec turbo prune @reality-shop/web --docker

FROM base AS builder

# Manifests first — this layer only invalidates when a dependency
# actually changes, not on every source edit.
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

COPY --from=pruner /app/out/full/ .

# codegen.ts's schema path reaches outside the pruned tree into a
# sibling workspace package — turbo prune has no way to know about a
# loose relative-file reference, only package.json dependency edges.
# This is the one file actually needed, copied from the real (unpruned)
# build context rather than pruning services/api wholesale for it.
COPY services/api/src/schema.gql services/api/src/schema.gql

# Next's build loads the page module during "Collecting page data" to
# determine static-vs-dynamic rendering (even for a route that's fully
# dynamic at runtime), which transitively imports env.ts via gqlFetch
# and generateMetadata — so env.ts's z.url() validation runs here too,
# not just at next.config.ts load. Official t3-env pattern for exactly
# this: https://create.t3.gg/en/deployment/docker. Set only for this
# build stage, never in the runtime stage, so the real check still
# fails loudly at actual container startup if misconfigured.
ENV SKIP_ENV_VALIDATION=true

# Turbo's default strict env mode only passes vars declared in
# turbo.json's env/globalEnv keys through to child processes — verified
# this drops SKIP_ENV_VALIDATION (and API_URL/SITE_URL earlier) silently
# otherwise. --env-mode=loose scopes "pass everything through" to just
# this build invocation, instead of making it part of every task's
# cache key via turbo.json (which would affect local dev too).
RUN pnpm exec turbo build --filter=@reality-shop/web --env-mode=loose

# Fresh base — nothing from the builder stage carries forward except
# what's explicitly COPYed (verified: builder-only ENVs like
# SKIP_ENV_VALIDATION don't leak here).
FROM node:22-slim AS runtime
WORKDIR /app/apps/web
USER node

# Standalone output preserves the monorepo's relative path structure
# (server.js ends up at apps/web/.next/standalone/apps/web/server.js,
# not at the top level), and deliberately excludes static assets and
# public/ from the trace — both verified against the actual build output.
COPY --from=builder --chown=node:node /app/apps/web/.next/standalone/ /app/
COPY --from=builder --chown=node:node /app/apps/web/.next/static/ ./.next/static
COPY --from=builder --chown=node:node /app/apps/web/public/ ./public

# server.js reads PORT/HOSTNAME from env — same class of default
# mismatch already hit once with services/api's PORT, set explicitly
# rather than relying on Next's default here too. API_URL/SITE_URL are
# deliberately absent — real values come from Dokploy at container
# start, never baked in (see env.ts's SKIP_ENV_VALIDATION comment).
ENV PORT=6767
ENV HOSTNAME=0.0.0.0
EXPOSE 6767

CMD ["node", "server.js"]

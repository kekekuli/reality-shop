# Getting started

## Local development

Prerequisites: Node (see `.nvmrc`), pnpm (version pinned via
`packageManager` in `package.json`), Docker.

```
pnpm install
pnpm db:init   # bootstraps a disposable local Postgres and applies migrations
pnpm dev       # starts web + api + a local Traefik rehearsing prod routing
```

`pnpm db:init` (`scripts/db-init.mjs`) is dev-only: if `DATABASE_URL`
isn't already set, it starts Postgres via `compose.dev.yaml`, which
applies `infra/postgres-init.sql` automatically on first start, offers
to grant `CREATEDB` (needed for `prisma migrate dev`'s shadow database —
a dev-only privilege), and offers to run migrations. It's interactive
and never appropriate outside local dev — see "Deployment" for how
migrations run in production instead.

Copy `services/api/.env.example` → `.env` and
`apps/web/.env.local.example` → `.env.local` if you need to override
anything `db:init` doesn't set for you.

Once running:

| Port | What |
|------|------|
| `:6767` | web app directly |
| `:7676` | api directly |
| `:8000` | Traefik — same-origin view rehearsing the production routing (ADR-020) |
| `:8081` | Traefik dashboard |

`compose.dev.yaml` (Postgres + this local Traefik) exists purely for
local convenience and rehearsal — it is not what gets deployed.

## Deployment

Production reuses an **existing** PostgreSQL instance rather than
provisioning a fresh one (ADR-004) — it is not part of this repo's
deploy configuration. Before the first deploy against any such
instance, `infra/postgres-init.sql` must be applied manually, once:

```
psql -h <host> -p <port> -U <admin> -d postgres \
     -v ON_ERROR_STOP=1 -f infra/postgres-init.sql
```

Export `APP_DB_PASSWORD` to a real secret first — the script defaults
to a dev password otherwise.

`apps/web/Dockerfile` and `services/api/Dockerfile` are multi-stage,
turbo-prune-based builds, published to `ghcr.io`. Dokploy deploys from
those built images (a compose-mode project pulling both), not by
building from source on the server. Domain/path routing (`/`, `/api/*`,
`/graphql`) is configured directly in Dokploy per ADR-020, not in this
repo. Database migrations (`prisma migrate deploy`) run as an
independent, gated CI step before Dokploy is triggered to deploy the
new images — see `DECISIONS.md` for the settled design.

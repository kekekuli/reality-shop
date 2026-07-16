# Architecture

## Tech stack (decided in M0 — see ADR-010…014 and docs/m0/tech-stack.md)
- Full-stack TypeScript (ADR-010); Go remains acceptable for an
  individual service later if a concrete reason appears.
- Frontend: Next.js (web) + Expo/React Native (mobile); Tauri only if
  a desktop app is ever built.
- Backend: NestJS, structured as a modular monolith (`services/api`)
  until the M5 microservice split (ADR-014).
- API style: GraphQL as the BFF-to-client protocol; internal
  service-to-service communication stays REST/direct (ADR-011).
- Delayed/async tasks: BullMQ on Redis (ADR-012). Redis is a new
  runtime dependency, deployed as a Dokploy container.
- Auth: short-lived JWT + rotating refresh tokens in Redis (ADR-013).

## Repo organization: monorepo
Single repository managed with pnpm workspaces + Turborepo.
Rationale: JS/TS-first stack; multi-platform clients need heavy sharing
of types and client code; solo project with no multi-team isolation
needs; one commit syncs all platforms; easier for AI tools to see the
whole picture.

Directory layout:
- apps/       user-facing applications (web / mobile / desktop)
- services/   backend microservices + BFF (product / order / user / bff ...)
- packages/   cross-platform shared code (shared-types / api-client / ui)
- infra/      deployment & infrastructure (Helm / K8s / CI config)
- docs/       documentation (decision docs may live at repo root)
- Root: PRODUCT_PLAN.md / ARCHITECTURE.md / DECISIONS.md / CLAUDE.md

During M0 the root contains docs only; the subdirectories appear from
M1 onward. Polyrepo is deferred until scale/multi-team needs arise.

## Existing environment (already running; reuse as foundation, don't rebuild)
One production-grade VPS, currently running:
- Dokploy: self-hosted PaaS orchestration, used for early deployment
  (M1–M4, for fast results).
- OpenObserve: observability platform (logs/metrics/traces). E-commerce
  services instrument with OpenTelemetry and export directly to it;
  no separate monitoring stack.
- Strapi: CMS. Reused as the data source and admin UI for content-type
  data (product editorial content / promotions / banners) — the content
  half of the operations console.
- PostgreSQL: reused, but this project must use a dedicated database +
  dedicated user, isolated from Strapi.

## Environment isolation strategy (important)
- Keep the existing production box stable; never use it for K8s
  experiments (K8s tinkering is high-risk).
- K8s/cloud-native learning uses separate environments:
  - Primary candidate: Oracle Cloud always-free ARM (4 cores/24GB,
    SG region, low latency; mind arm64 image architecture).
  - Managed experience: spin up GKE Autopilot at some stage to
    experience the real cloud ecosystem (cloud LB/disks/IAM/Ingress);
    on-demand, delete after practicing.
  - Local drafts: kind/minikube for YAML/Helm experiments.
- The existing box's value to the new project: external dependencies
  (PG hosting the ecommerce database, OpenObserve receiving telemetry,
  Strapi serving product content).

## Database initialization
On the existing PG, create a dedicated database for e-commerce:
- database: ecommerce
- dedicated user, permission-isolated from Strapi
- when splitting into microservices later, split by schema within this
  database first

## Data sources & mocking
- Content-type data (products/promotions/banners) → Strapi; bulk-load
  via API scripts, or generate with Faker and import.
- Transactional data (orders/logistics traces/inventory ledgers) → a
  dedicated generator service writing directly into the ecommerce
  database.

## Deployment evolution
- M1–M4: deploy with Dokploy (results first).
- M5: migrate to K8s (k3s on the Oracle free machine); feel the
  PaaS vs K8s difference.

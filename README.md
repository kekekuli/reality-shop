# Reality Shop

An e-commerce project built to walk the **entire path of a real
user-facing service** — from product design to production operations.
The shop (a consumer-electronics storefront, web + mobile) is the
vehicle; the goal is practicing all eight capability domains: product &
requirements, application development, data, infrastructure &
deployment, quality & reliability, security & compliance, operations &
support, growth & feedback.

## Status

**Current milestone: M2 (business loop).** M0 design docs and M1's
end-to-end path are both complete: web + api deployed via Dokploy, CI/CD
through GitHub Actions (lint/typecheck/test → build+push images →
gated migrations → deploy webhook), live and serving real seeded data.

| Milestone | Theme | Status |
|-----------|-------|--------|
| M0 | Product & design docs | ✅ done |
| M1 | Minimal end-to-end path (web → API → PG, deployed) | ✅ done |
| M2 | Business loop: cart → order → mock payment → mock logistics + auth | ⏳ |
| M3 | Operations console | ⏳ |
| M3.5 | Mobile client (Expo/RN) | ⏳ |
| M4 | Quality & observability | ⏳ |
| M5 | K8s migration & microservice split | ⏳ |
| M6 | Security & productionization | ⏳ |
| M7 | Growth (optional) | ⏳ |

## Documentation map

| Doc | What's in it |
|-----|--------------|
| [PRODUCT_PLAN.md](PRODUCT_PLAN.md) | Goals, capability domains, milestone roadmap |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Stack, repo layout, existing environment, isolation strategy |
| [DECISIONS.md](DECISIONS.md) | Decisions not yet built, and questions still open |
| [ALTERNATIVES.md](ALTERNATIVES.md) | Options weighed and turned down — consulted only when reopening a settled choice |
| [docs/m0/user-journey.md](docs/m0/user-journey.md) | Core user journeys, journey→milestone mapping |
| [docs/m0/business-flows.md](docs/m0/business-flows.md) | Order state machine, payment/logistics flows, task reliability |
| [docs/m0/data-model.md](docs/m0/data-model.md) | ER model, table definitions, conventions |
| [docs/m0/tech-stack.md](docs/m0/tech-stack.md) | Finalized multi-platform tech plan & topology |
| [docs/getting-started.md](docs/getting-started.md) | Local dev setup and deployment — kept clearly separate |

## Stack at a glance

TypeScript everywhere · Next.js (web) · Expo/React Native (mobile) ·
NestJS modular monolith → microservices at M5 · GraphQL BFF ·
PostgreSQL · BullMQ + Redis · Strapi (content) · OpenTelemetry +
OpenObserve · Dokploy → k3s.

## Repository layout (from M1)

```
apps/       user-facing apps (web / mobile)
services/   backend (api monolith → split services), mock-data generator
packages/   shared-types / api-client / config
infra/      Dokploy config now, Helm/K8s from M5
docs/       design documentation
```

## Getting started

See [docs/getting-started.md](docs/getting-started.md) — local dev
setup and deployment are kept as clearly separate sections there, since
they use different databases, different env handling, and different
tooling end to end.

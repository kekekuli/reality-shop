# Architecture Decision Records (ADR)

This file holds decisions that are **not yet built** — planned
architecture, and questions still open. Each entry is "decision + why."

An entry leaves when its code ships: the implementation then states
what was decided, and whatever alternative was turned down moves to
[ALTERNATIVES.md](ALTERNATIVES.md), which is the one thing code cannot
show. Numbers are never reused and never renumbered, so gaps in the
sequence are expected; when a later decision changes an earlier one
that has not shipped yet, rewrite it in place.

Every entry also gets a line in the index below. The index is the entry
point: scan it before opening a new decision, so that a question
already settled is recognized as settled instead of being re-decided
under a new number.

## Index
- **ADR-003** — Dokploy for M1–M4; migrate to K8s at M5, on a system that already exists.
- **ADR-004** — Reuse the existing box's Strapi / OpenObserve / PostgreSQL rather than rebuilding.
- **ADR-005** — K8s experiments live on a separate free-tier machine, never the production box.
- **ADR-007** — Strapi holds pure content only; SPU/SKU/price/inventory master data is ours.
- **ADR-009** — Reserve inventory on order submission; payment timeout cancels via a delayed task, not polling.
- **ADR-011** — GraphQL (code-first) exists only at the BFF edge; service-to-service stays REST/direct.
- **ADR-013** — Short-lived access JWT + rotating refresh tokens in Redis; cookies on web, SecureStore on mobile.
- **ADR-014** — `services/api` stays a modular monolith until M5: domain modules plus the GraphQL BFF layer.
- **ADR-015** — The database stores language-neutral keys; closed vocabularies translate in next-intl, open copy in Strapi.
- **ADR-019** — Tests: pure logic gets unit tests now; DB-dependent logic gets integration tests against a test database, built in M4.

## ADR-003 Dokploy early; K8s deferred to M5
The existing environment already runs Dokploy; use it early to ship
results fast. Migrate to K8s once a real system exists — the learning
is better (migrating something real rather than practicing on Hello
World) and business progress isn't blocked.

## ADR-004 Reuse existing assets
Strapi as the content back office/data source, OpenObserve as the
observability platform, PG reused but isolated. Avoid rebuilding
wheels; focus on what actually needs practicing.

## ADR-005 Physically isolate the K8s learning environment from the production box
K8s tinkering is high-risk; use a dedicated Oracle always-free machine
(4 cores/24GB, SG region) so running production services aren't
polluted. Also try managed K8s (GKE) at least once to cover the cloud
ecosystem side.

## ADR-007 Narrow Strapi to pure content; own the product master data
A product is inherently a "content + transaction" hybrid. Master data
(SPU/SKU/price/inventory) lives in the ecommerce database, owned by our
own product service; Strapi handles pure content only (product
editorial content, banners, promotion assets), linked by SPU slug/id
and aggregated by the BFF. Rationale: Strapi has no native
SPU/SKU/inventory model; order placement with inventory deduction needs
database transactions, and product listings need multi-dimensional
filtering — all beyond a CMS's capability boundary — while pure content
management is exactly what Strapi excels at, preserving its reuse value
(extends ADR-004). If the content side also proves awkward, falling
back to "Strapi for banners/campaign pages only" is a cheap migration.

## ADR-009 Reserve inventory at order submission; timeout cancellation via delayed tasks, not polling
Inventory follows the mainstream "reserve on order, deduct on payment":
within the order-submission transaction available→reserved; on payment
success the reservation converts to a real deduction; cancellation or
timeout rolls it back. Rationale: closer to production practice than
"deduct on payment only," and it exercises the full
reserve-confirm-release state migration. Payment-timeout cancellation
is driven by a delayed task (scheduled at order creation; on firing it
cancels only if the order is still pending payment) — no periodic
table-scan polling. Timeout is configurable, default 15 minutes,
shorter in demo environments. The delayed-task component choice was
left open here; settled since as BullMQ on Redis (ARCHITECTURE.md).

## ADR-011 GraphQL as the BFF-to-client protocol; internal calls stay simple
Web and mobile need different projections of the same data — the
classic BFF + GraphQL fit. Code-first schema generation from NestJS
keeps the type chain unbroken end to end. Accepted costs, deliberately:
DataLoader against N+1, loss of plain HTTP caching, and query
depth/complexity limits (to be practiced in M6 security). Boundary
rule: GraphQL exists only at the BFF edge; service-to-service
communication stays REST/direct so internal complexity doesn't double.

## ADR-013 Auth: short-lived JWT + rotating refresh tokens
Session cookies are browser-centric and awkward on React Native;
long-lived pure JWTs cannot be revoked. The hybrid takes both
strengths: ~15-minute access JWTs (stateless verification) plus
long-lived rotating refresh tokens stored hashed in Redis (instant
revocation at the layer where it matters). Transport per platform:
web keeps tokens in httpOnly cookies (XSS mitigation); mobile stores
them in Expo SecureStore/Keychain and sends `Authorization: Bearer`.
One auth backend, two carriage styles — the standard multi-client
shape.

## ADR-014 Modular monolith until M5
M1–M4 ship a single NestJS service (`services/api`) containing domain
modules (user/product/order/payment-mock/logistics-mock) plus the
GraphQL BFF layer. Module boundaries mirror the data model's domain
groups and the future service split, so M5 extracts services along
existing seams instead of refactoring blindly. Microservices before
there is anything to operate would front-load infrastructure pain that
ADR-003 and the breadth-first working rule explicitly defer.

## ADR-015 i18n: the database stores language-neutral keys; user-facing copy lives elsewhere
The database never stores display copy: every text column holds a slug,
English master-data name, spec key or status enum. Multi-language text
would poison indexes and unique constraints — `skus.spec_values` sits in a
composite unique index, so "黑色" instead of `black` makes one
variant look like several — and keys keep filtering and order snapshots
locale-independent.

Translation sits above, split by vocabulary: closed sets (category names,
spec dimensions and values, status enums, UI labels) in next-intl
dictionaries, which stay complete because the domain is finite;
open-ended copy (titles, descriptions, spec sheets) in Strapi's i18n
plugin, since it grows per product and needs non-technical editing
(extends ADR-007). `products.title` keeps its English name for internal
identification and order snapshots.

Keys mirror the data's structure so the front end derives them
mechanically: `category.<slug>`, `spec.<key>`, `spec.<key>.<value>`,
`status.<entity>.<value>` — namespaced per entity because product and SKU
share values today but may diverge. M1 consequence: seed data uses English
identifiers and `apps/web` adopts next-intl with a `[locale]` segment from
the start, since retrofitting routing later is expensive.

## ADR-019 Testing strategy: unit-test pure logic; integration-test DB logic in M4
What is worth testing is logic that fails *silently* — wrong data, no
error. Pure functions with such logic (cursor codec, money scalar) get
unit tests now; they are cheap and touch no database. Logic living in SQL
(keyset pagination, where a mis-written `OR` branch drops or repeats rows)
needs a real database, since mocking Prisma tests the mock. CRUD
pass-throughs are not tested — that tests Prisma.

The integration harness lands in M4, where PRODUCT_PLAN puts testing, so
M1 stays breadth-first; until then keyset is verified by hand (colliding
`created_at` rows, paged one at a time). Its shape: a dedicated `_test`
database on the existing Postgres (mirroring ADR-004's isolation),
migrations once per suite, transaction rollback per test, and a guarded
connection string so tests can never hit the dev database. Testcontainers
is heavier than needed; SQLite's `timestamptz`/ordering differs from
Postgres — exactly what keyset depends on.

Unit tests sit beside their source, matching the repo's
one-concern-per-file style; the M4 suite gets its own `test/` directory,
since those tests belong to no single file and share setup.

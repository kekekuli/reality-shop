# Architecture Decision Records (ADR)

Format: each entry is "decision + why." Append new decisions at the
end. Entries are append-only: when a later decision changes an earlier
one, add a new entry and mark the old one "Superseded by ADR-XXX" —
never delete history. Forward references ("to be decided in …") should
be updated to point at the resolving ADR once it exists.

Every appended entry also gets a line in the index below. The index is
the entry point: scan it before opening a new decision, so that a
question already settled is recognized as settled instead of being
re-decided under a new number.

## Index
- **ADR-001** — E-commerce is the vehicle; it naturally spans every capability domain.
- **ADR-002** — Breadth first: open the end-to-end path before deepening any domain.
- **ADR-003** — Dokploy for M1–M4; migrate to K8s at M5, on a system that already exists.
- **ADR-004** — Reuse the existing box's Strapi / OpenObserve / PostgreSQL rather than rebuilding.
- **ADR-005** — K8s experiments live on a separate free-tier machine, never the production box.
- **ADR-006** — Monorepo (pnpm workspaces + Turborepo); cross-platform type sharing is a hard requirement.
- **ADR-007** — Strapi holds pure content only; SPU/SKU/price/inventory master data is ours.
- **ADR-008** — One vertical (3C), modelled multi-category-extensible: category tree + attribute templates + JSONB.
- **ADR-009** — Reserve inventory on order submission; payment timeout cancels via a delayed task, not polling.
- **ADR-010** — Full-stack TypeScript: NestJS backend, Next.js web, Expo/React Native mobile.
- **ADR-011** — GraphQL (code-first) exists only at the BFF edge; service-to-service stays REST/direct.
- **ADR-012** — BullMQ on Redis for delayed tasks (resolves ADR-009's open choice).
- **ADR-013** — Short-lived access JWT + rotating refresh tokens in Redis; cookies on web, SecureStore on mobile.
- **ADR-014** — `services/api` stays a modular monolith until M5: domain modules plus the GraphQL BFF layer.
- **ADR-015** — The database stores language-neutral keys; closed vocabularies translate in next-intl, open copy in Strapi.
- **ADR-016** — Money crosses GraphQL as a string-carried BigInt scalar; primary keys surface as `ID`.
- **ADR-017** — Collections paginate Relay-style with opaque `(sortKey, id)` keyset cursors.
- **ADR-018** — M1 GraphQL layer: Apollo driver, explicit field decorators, hand-rolled money scalar, per-request DataLoader.
- **ADR-019** — Tests: pure logic gets unit tests now; DB-dependent logic gets integration tests against a test database, built in M4.
- **ADR-020** — BFF same-origin boundary is enforced by Dokploy's reverse proxy, not app code; `services/api` stays route-prefix-agnostic.

## ADR-001 E-commerce as the vehicle for exploring all capability domains
E-commerce naturally covers content display, transaction processing,
payment, inventory, promotions, and back-office operations — enough
architectural complexity to support "exploring a complete user-facing
service."

## ADR-002 Breadth first, not single-point technical deep dives
Open the end-to-end path before deepening each domain, to avoid getting
stuck on infrastructure early with nothing demoable for a long time.
The project's main line is "walk through all capability domains once,"
not cloud-native only.

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

## ADR-006 Monorepo
Solo full-stack project, JS/TS-first stack; sharing types and client
code across platforms (web/mobile/desktop) is a hard requirement.
A monorepo enables shared code, cross-platform sync in one commit, and
whole-picture visibility for AI tools. Managed with pnpm workspaces +
Turborepo. No polyrepo until scale or multiple teams demand it.

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

## ADR-008 Single vertical category (consumer electronics) + extensible modeling
Only consumer electronics (3C); no multi-category catalog. Category
heterogeneity (per-category attribute templates, dynamic filters,
per-category mock data) would concentrate complexity in one sub-problem
of the product domain, conflicting with breadth-first (ADR-002) —
capability-domain coverage is independent of category count. The data
model nevertheless stays multi-category extensible via three
provisions: ① the category table is a tree (parent_id); ② product
specs are not hard-coded columns — attribute templates + JSONB;
③ category slugs appear in URL/API design. The product model is the
standard SPU + multi-spec SKU (inventory/price attached to SKU).
Electronics' spec dimensions (color/storage/edition) fit this model
naturally, and rich spec sheets suit Strapi's content side. Adding a
category later is a data task, not a schema change.

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
left open here and resolved in ADR-012: BullMQ + Redis.

## ADR-010 Full-stack TypeScript: NestJS backend, Next.js web, Expo/React Native mobile
Confirms the JS/TS-first leaning as final. NestJS provides an
enterprise-grade skeleton (modules/DI, guards/interceptors/pipes,
first-class GraphQL and BullMQ integrations, and a microservice
transport layer useful for the M5 split). E-commerce is an I/O-bound
workload — Node's strong suit; scaling is horizontal and the real
bottleneck is the database, not the framework. One language across the
monorepo preserves the shared-types dividend (ADR-006). Go remains
acceptable for an individual service later if a concrete reason
appears. Desktop (Tauri) stays "only if ever needed," outside M0
commitments.

## ADR-011 GraphQL as the BFF-to-client protocol; internal calls stay simple
Web and mobile need different projections of the same data — the
classic BFF + GraphQL fit. Code-first schema generation from NestJS
keeps the type chain unbroken end to end. Accepted costs, deliberately:
DataLoader against N+1, loss of plain HTTP caching, and query
depth/complexity limits (to be practiced in M6 security). Boundary
rule: GraphQL exists only at the BFF edge; service-to-service
communication stays REST/direct so internal complexity doesn't double.

## ADR-012 BullMQ + Redis for delayed tasks (resolves ADR-009's open choice)
BullMQ is the de-facto JS-ecosystem job queue, with official NestJS
integration and the Bull Board UI. Redis is runtime infrastructure —
a peer of PostgreSQL, not a code-organization concern — so it does not
affect the monorepo; the true cost is one more stateful service to
operate (a Dokploy container now, a K8s workload in M5). The investment
amortizes: refresh-token storage (ADR-013), caching, and M6 rate
limiting will reuse it.

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
ADR-002/003 explicitly defer.

## ADR-015 i18n: the database stores language-neutral keys; user-facing copy lives elsewhere
The database never stores display copy: every text column holds a slug,
English master-data name, spec key or status enum. Multi-language text
would poison indexes and unique constraints — `skus.spec_values` sits in a
composite unique index (ADR-008), so "黑色" instead of `black` makes one
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

## ADR-016 Money crosses the GraphQL boundary as a BigInt scalar; identity uses `ID`
Extending ADR-011. `*_cents` fields cross through a custom BigInt scalar,
carried as strings and parsed back to native `bigint` on the client; the
shared `Cents` type becomes a branded `bigint`. Primary keys stay `bigint`
in the database and surface as `ID` — already a string, never used in
arithmetic.

Prisma returns `bigint` and JSON cannot carry it, so some representation
must be chosen regardless. GraphQL's `Int` is 32-bit — a ~21.47M CNY
ceiling that no single price reaches but M3's aggregates can; strings have
none. Paying the cost now, with one price field and no front end, beats
paying it after M3, when it would ripple through codegen output and every
component reading money. Rounding stays out of scope: integer cents keep
addition and multiplication exact, and division — discounts, coupon
proration — arrives with M3 and needs a policy of its own.

## ADR-017 List queries paginate Relay-style with composite keyset cursors
Collection fields follow the Relay connection spec — `Connection` /
`Edge` / `PageInfo`, arguments `first` / `after`. The cursor is an opaque
base64 `(sortKey, id)`, decoded server-side into a row-value comparison
served by a composite index; all pagination state lives there, none on
the server.

The `id` component is mandatory because sort keys are not unique — two
products at the same price would leave the boundary ambiguous and
silently drop or repeat rows. Relay is chosen over a simpler `items` +
`nextCursor` because Apollo Client's `relayStylePagination` cache policy
applies only to it; the accepted trade-off is no jumping to an arbitrary
page. `totalCount` waits until a filter-result count appears in the UI —
adding a connection field is backward compatible.

## ADR-018 The M1 GraphQL layer: how ADR-011/016/017 land
Build decisions, several discovered while verifying rather than chosen.

- **`@nestjs/apollo`**, not Mercurius: that needs Fastify, and the
  bottleneck is PostgreSQL. `schema.gql` sorted and committed so web
  codegen reads it and API changes become diffs; introspection off in
  production.
- **Explicit `@Field()`**, not the CLI plugin, which needs extra setup
  under the swc builder's `typeCheck: false`.
- **A mapper layer is mandatory**: graphql-js's `ID` rejects `bigint`, so
  Prisma models never reach a resolver's return value. That seam enforces
  ADR-016.
- **Hand-rolled money scalar**: `graphql-scalars`' `GraphQLBigInt` returns
  a number for safe integers and a string beyond, varying wire type by
  magnitude — the branching ADR-016 exists to prevent.
- **DataLoader from M1**, per request in the context factory. Not for
  speed: batching forces `findSkusByProductIds(ids)` onto domain services,
  the signature a remote call wants at the M5 split — an addition now, a
  refactor after M2. A singleton loader leaks rows across users.
- **Keyset predicate in expanded `OR` form** (Prisma has no row-value
  expression), shipping with ADR-017's `(status, created_at, id)` index.
- **M1 surface**: `products(first, after, categorySlug)` and
  `product(slug)`. `attrs` and inventory wait for M2's cart; `spec_values`
  crosses as typed pairs, since a JSON scalar makes codegen emit `any`.

Verify by counting statements in the Prisma query log — the failures are
silent: batch functions returning rows in database order (`IN (…)` neither
preserves order nor pads misses), and resolvers that await before
`.load()`, missing the batch tick and reverting to N+1.

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

## ADR-020 BFF same-origin boundary lives in Dokploy's reverse proxy; `services/api` stays route-prefix-agnostic
ADR-011 established that the browser only ever talks to the BFF edge, but
left open *how* that same-origin boundary gets implemented. Settled: at
the infra layer (Dokploy's Traefik-based reverse proxy), not in
application code. One public domain (`domain.com`) carries three routing
rules onto two containers:

| Public path        | Middleware              | Forwards to (api container) | Backs           |
|---------------------|--------------------------|------------------------------|-----------------|
| `/` (catch-all)     | none                     | —                            | web app (Next.js) |
| `/api/*path`        | strip-prefix `/api`      | `/*path`                     | future REST endpoints (today: only `/health`) |
| `/graphql`          | none (exact passthrough) | `/graphql`                   | GraphQL BFF     |


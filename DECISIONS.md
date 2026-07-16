# Architecture Decision Records (ADR)

Format: each entry is "decision + why." Append new decisions at the
end. Entries are append-only: when a later decision changes an earlier
one, add a new entry and mark the old one "Superseded by ADR-XXX" —
never delete history. Forward references ("to be decided in …") should
be updated to point at the resolving ADR once it exists.

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

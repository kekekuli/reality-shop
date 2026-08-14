# M2 · Business Loop — Scope

Goal: a registered user browses, adds to cart, orders, pays through
Stripe in test mode, watches mock logistics advance, and confirms
receipt. Journeys A–D
except C9 (user-journey.md). Web only — mobile is M3.5.

Governing decisions: ADR-009 (reserve on submit, delayed cancel),
ADR-012 (BullMQ/Redis), ADR-013 (JWT + rotating refresh), ADR-014
(modular monolith), ADR-015 (Strapi on detail + checkout lines),
ADR-019 (no integration harness until M4).

## Slices

Each slice is independently demoable and lands in order; later slices
depend on earlier ones.

| # | Slice | Delivers |
|---|-------|----------|
| S0 | Foundations | Redis `8.10-alpine`, run with `--appendonly yes --maxmemory-policy noeviction` (neither is optional — see the comment in `compose.dev.yaml`); user-domain migration (`users`, `addresses`); empty `user`/`cart`/`order`/`payment`/`logistics-mock` modules so the ADR-014 seams exist from the start. Order-domain tables land with S5, BullMQ with the first queue that needs it |
| S1 | Auth (D1/D2/D4) | register/login/refresh/logout mutations + `me`; argon2id hashes; refresh tokens hashed in Redis; one guard accepting cookie *or* Bearer; web login/register pages |
| S2 | Addresses (D3) | CRUD + default-address partial unique index |
| S3 | Browse depth (A2/A3/B1/B2) | Catalog surface ADR-018 deferred: `attrs`, SKU resolution from spec values, per-SKU availability; category filters; ILIKE/full-text search; detail page with Strapi `product-content` by slug |
| S4 | Cart (B3/B4/C1) | localStorage guest cart, server cart when logged in, merge-on-login (quantities add) |
| S5 | Order submission (C2/C3) | Order-domain migration; BullMQ wired into Nest with its first queue (`order-timeout`); atomic `UPDATE inventory … WHERE available >= n` per SKU, order + snapshot items, `order_events` + `inventory_ledger`, cart cleanup, timeout job scheduled after commit |
| S6 | Payment (C4/C5) | Stripe sandbox (test keys on the signed-up account) with Checkout Sessions, instead of a hand-rolled mock. Payment is confirmed by the signature-verified `checkout.session.completed` webhook, a REST endpoint under `/api`; cancellation stays with our own `order-timeout` job |
| S7 | Mock logistics (C7) | BullMQ chain per business-flows §4; trace timeline on order detail |
| S8 | Orders (C6/C8) | Order list/detail, confirm receipt; status by polling — no subscriptions in M2 |
| S9 | `services/mock-data` | Faker generator, re-runnable, writes PG directly and Strapi via API |

## Decisions still open

To settle as each slice starts, appended to DECISIONS.md then:

- **Mutation error shape** (before S1). M1 is queries only, so there is
  no convention. Out-of-stock at checkout is an *expected* outcome that
  must name the offending SKUs — typed result unions for business
  failures vs. thrown errors for the unexpected, decided once.
- **Auth carriage in the App Router** (S1). ADR-013 says httpOnly
  cookies, but RSCs cannot set cookies, so refresh rotation cannot
  happen during a server render.
- **Worker topology** (S0). BullMQ workers in the api process (simple,
  matches ADR-014) vs. a separate deployable.
- **State-machine enforcement point** (S5). One transition helper that
  writes `order_events` on every change, so no resolver updates
  `orders.status` directly.
- **Submit idempotency** (S5). Double-click must not create two orders
  and two reservations.

## Races verified by hand (ADR-019 defers the harness to M4)

M4's integration suite starts from these; until then each is checked
manually once and the check recorded here.

1. **Overselling.** Concurrent `submitOrder` on the last unit of a SKU
   — exactly one succeeds, `available` never goes negative.
2. **Callback vs. timeout.** Payment callback and the cancellation job
   firing together — the status precondition lets exactly one win, the
   other no-ops.
3. **Duplicate webhook.** Stripe retries on any non-2xx response, so the
   same event arrives more than once by design — replaying it must leave
   inventory and order state unchanged.

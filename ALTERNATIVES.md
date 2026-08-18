# Rejected Alternatives

Shipped code states what was built; it cannot state what was weighed and
turned down. That is the only thing kept here.

An entry lands when its decision ships and leaves DECISIONS.md, which
holds open questions only.

This is a reference, not background reading — for people and AI agents
alike. Nothing here is needed to work on the codebase; the code says
what was built. Open the one relevant entry when you mean to undo a
choice recorded here, and leave the rest closed.

## Catalog breadth: one vertical, not a multi-category catalog
**Chosen:** consumer electronics (3C) only, with a data model that stays
multi-category extensible — the category table is a tree (`parent_id`),
specs are attribute templates + JSONB rather than hard-coded columns,
and category slugs appear in URL/API design. Adding a category later is
a data task, not a schema change.

**Rejected:** a real multi-category catalog. Category heterogeneity
(per-category attribute templates, dynamic filters, per-category mock
data) concentrates complexity in one sub-problem of the product domain,
against the breadth-first working rule — and capability-domain coverage
is independent of category count.

## Money on the wire: a string-carried BigInt scalar, not `Int`
**Chosen:** `*_cents` fields cross GraphQL through a custom BigInt
scalar carried as strings and parsed back to native `bigint`; the shared
`Cents` type is a branded `bigint`. Primary keys stay `bigint` in the
database and surface as `ID`, already a string and never used in
arithmetic. Prisma returns `bigint` and JSON cannot carry it, so some
representation had to be chosen regardless.

**Rejected:** GraphQL's `Int`, which is 32-bit — a ~21.47M CNY ceiling
that no single price reaches but M3's aggregates do. Strings have no
ceiling. Paying the cost with one price field and no front end beat
paying it after M3, when it would ripple through codegen output and
every component reading money.

**Also rejected:** `graphql-scalars`' `GraphQLBigInt`, which returns a
number for safe integers and a string beyond — varying the wire type by
magnitude, the exact branching the custom scalar exists to prevent.

**Left open:** rounding. Integer cents keep addition and multiplication
exact; division — discounts, coupon proration — arrives with M3 and
needs a policy of its own.

## Pagination: Relay connections over keyset cursors
**Chosen:** the Relay connection spec (`Connection` / `Edge` /
`PageInfo`, `first` / `after`), with an opaque base64 `(sortKey, id)`
cursor decoded server-side into a row-value comparison served by a
composite index. All pagination state lives in the cursor.

**Rejected:** a simpler `items` + `nextCursor` shape. Apollo Client's
`relayStylePagination` cache policy applies only to Relay connections.
Accepted trade-off: no jumping to an arbitrary page.

**Not optional:** the `id` half of the cursor. Sort keys are not unique
— two products at the same price leave the boundary ambiguous, and the
failure is silent: rows repeat or vanish. `totalCount` waits until a
filter-result count appears in the UI; adding a connection field is
backward compatible.

## GraphQL server: `@nestjs/apollo`, code-first, explicit decorators
**Chosen:** `@nestjs/apollo`, with `schema.gql` sorted and committed so
web codegen reads it and API changes show up as diffs; introspection off
in production.

**Rejected:** Mercurius, which needs Fastify, while the bottleneck is
PostgreSQL either way.

**Rejected:** the `@nestjs/graphql` CLI plugin for implicit field types,
which needs extra setup under the swc builder's `typeCheck: false`.
Fields are declared explicitly instead.

**Forced, not chosen:** the mapper layer between Prisma models and
GraphQL types — graphql-js's `ID` rejects `bigint`, so Prisma models can
never reach a resolver's return value. The seam is what enforces the
money scalar.

## DataLoader from M1, before there was an N+1 problem
**Chosen:** per-request loaders built in the GraphQL context factory.

**Rejected:** adding them when performance demands it. The point is not
speed: batching forces `findSkusByProductIds(ids)` onto domain services
— the signature a remote call wants at the M5 split. An addition now, a
refactor after M2. (A singleton loader would leak rows across users.)

## Mutation errors: payload + `errors[]`, not typed result unions
**Chosen:** every mutation returns a payload carrying nullable `data`
and an `errors` array of `{ code, message }`, where `code` is a
schema-level enum clients render as `error.<CODE>` through next-intl.
Expected business failures travel in `errors`; unexpected ones are
thrown and surface as GraphQL errors.

**Rejected:** typed result unions per mutation (`RegisterOk |
EmailTaken`). They express each failure precisely, but every mutation
grows its own union and every client grows an `__typename` switch — and
out-of-stock at checkout, the case that motivated the choice, has to
name the offending SKUs, which a union member models no better than an
error entry with a payload.

## Auth carriage on web: API-minted cookies, refreshed in middleware
**Chosen:** the API is the only thing that mints cookies, set on its
`/graphql` response; the browser reaches it same-origin. Next middleware
(`apps/web/proxy.ts`) handles the one moment an RSC cannot — an expired
access cookie — by refreshing, putting the new token on the request so
the current render sees it and the new `Set-Cookie` on the response so
the browser stores it.

**Rejected:** Next route handlers (`/api/auth/*`) owning login and
refresh. It gives rotation an obvious home, but duplicates the auth
surface across two codebases and adds a hop to every call.

**Rejected:** keeping the access token in client-side JS memory with
only the refresh token in a cookie. Strongest XSS posture, but
authenticated pages lose server rendering, which is the pattern the rest
of the app is built on.

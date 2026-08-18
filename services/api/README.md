# api

NestJS modular monolith (ADR-014): domain modules under `src/modules`,
the GraphQL BFF layer that projects them under `src/bff`.

```
pnpm dev          # nest start --watch, port 7676
pnpm db:migrate   # prisma migrate dev
pnpm test         # vitest
```

## Traps

Both failure modes below are silent — no error, just wrong data — and
both are checked the same way: count statements in the Prisma query log.

- **A DataLoader batch function must re-key its own result.** `IN (…)`
  neither preserves the requested order nor pads misses, so returning
  rows in database order hands each key someone else's row. Group by id
  and map over the key array, padding absences — `sku.loader.ts` is the
  reference.
- **Awaiting before `.load()` reverts to N+1.** A resolver that awaits
  anything before calling the loader misses the batch tick, and the
  loader quietly degrades into one query per row.
- **Loaders are per-request**, built in the GraphQL context factory. A
  singleton would leak rows across users.

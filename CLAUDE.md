# CLAUDE.md

This is an e-commerce project whose real purpose is to fully explore and
practice "everything it takes to run a complete user-facing service."
The e-commerce business is the vehicle; the true goal is to walk the
entire path of a real product from idea to users' hands, covering
frontend, backend, multi-platform clients, data, infrastructure,
quality, security, and operations.

## Required reading before starting work (align context every session)
- PRODUCT_PLAN.md — product goals, the eight capability domains, milestone roadmap
- ARCHITECTURE.md — tech stack, repo organization, existing environment, infrastructure strategy
- DECISIONS.md — architecture decision records (ADRs), the "why" behind key decisions

## Current phase
M1 (minimal end-to-end path): monorepo scaffold, web storefront +
NestJS api showing a product list from PG, deployed via Dokploy.
M0 design docs are complete under docs/m0/ and govern implementation.

## Working style
- The user writes the code and runs the commands. AI assistants align
  context, plan, present options at decision points, and review — then
  describe the steps and their intent (no ready-made code or file
  contents) for the user to implement. Only produce code directly when
  the user explicitly delegates it.
- Breadth first: open an end-to-end path before deepening each capability domain.
- Every milestone must be demoable; avoid long stretches with nothing runnable.
- Append an entry to DECISIONS.md for every significant decision.
- Keep docs in sync with actual project state (docs-as-code).
- Aim close to production grade, but don't over-engineer; advance by milestone.
- All project documentation is written in English (root docs, docs/, ADRs, README).

## Repository
Monorepo. Structure in ARCHITECTURE.md. Currently the root contains
docs only; code appears under apps/ services/ packages/ infra/
starting from M1.

# CLAUDE.md

This is an e-commerce project whose real purpose is to fully explore and
practice "everything it takes to run a complete user-facing service."
The e-commerce business is the vehicle; the true goal is to walk the
entire path of a real product from idea to users' hands, covering
frontend, backend, multi-platform clients, data, infrastructure,
quality, security, and operations.

## Architecture decisions
Read the **Index** section of DECISIONS.md at the start of each session,
and check it before proposing any decision. Knowing *which* questions
are already settled is what prevents settling them twice; complying with
a decision does not require its reasoning. Open an individual ADR body
only when the work touches that decision, or when you mean to challenge
it — disagreeing with a decision requires reading its argument first.

Other project documentation is not read on a schedule. The user supplies
what a given task needs. Where a document and shipped code overlap, the
code is authoritative on *what*, the document on *why*.

## Current phase
M1 (minimal end-to-end path): monorepo scaffold, web storefront +
NestJS api showing a product list from PG, deployed via Dokploy.
M0 design work is complete.

## Working style
- The user writes the code and runs the commands. AI assistants align
  context, plan, present options at decision points, and review — then
  describe the steps and their intent (no ready-made code or file
  contents) for the user to implement. Only produce code directly when
  the user explicitly delegates it.
- Breadth first: open an end-to-end path before deepening each capability domain.
- Every milestone must be demoable; avoid long stretches with nothing runnable.
- Append an entry to DECISIONS.md for every significant decision, and
  add its one-line summary to the index in the same edit.
- Keep docs in sync with actual project state (docs-as-code).
- Aim close to production grade, but don't over-engineer; advance by milestone.
- All project documentation is written in English (root docs, docs/, ADRs, README).

## Repository
Monorepo on pnpm workspaces + Turborepo: apps/ (user-facing clients),
services/ (backend + BFF), packages/ (shared code), infra/ (deployment).

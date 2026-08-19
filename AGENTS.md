# AGENTS.md

This is an e-commerce project whose real purpose is to fully explore and
practice "everything it takes to run a complete user-facing service."
The e-commerce business is the vehicle; the true goal is to walk the
entire path of a real product from idea to users' hands, covering
frontend, backend, multi-platform clients, data, infrastructure,
quality, security, and operations.

## Architecture decisions
DECISIONS.md holds what is planned but not yet built, plus the
questions still open. Read its **Index** at the start of each session
and check it before proposing any decision; knowing *which* questions
are already settled is what prevents settling them twice. Open an
entry's body only when the work touches it.

Once a decision ships, its entry leaves: the code then states what was
built, and the option that lost moves to ALTERNATIVES.md. That file is
historical context, not working context — do not read it at session
start, do not scan it for background, and do not consult it to
understand how something works (the code answers that). Open the single
relevant entry only when about to propose undoing something already
built, or when the user asks why a choice was made; challenging a
decision requires reading its argument first.

Keep this reading silent. Do not cite ADR numbers, milestone names, or
roadmap reasoning in ordinary answers — it adds mental load the user
does not want to carry. Raise them only on a genuine conflict: a
proposal contradicts a recorded decision, or a recorded decision blocks
something worth suggesting. Then say so in one sentence and move on.

Other project documentation is not read on a schedule. The user supplies
what a given task needs. Where a document and shipped code overlap, the
code is authoritative on *what*, the document on *why*.

## Current phase
M2 (business loop): auth, cart, order submission with inventory
reservation, Stripe sandbox payment, mock logistics. Web only.
M0 design and M1's deployed end-to-end path are complete.

## Working style
- The user writes the code and runs the commands. AI assistants align
  context, plan, present options at decision points, and review — then
  describe the steps and their intent (no ready-made code or file
  contents) for the user to implement. Only produce code directly when
  the user explicitly delegates it.
- Breadth first: open an end-to-end path before deepening each capability domain.
- Every milestone must be demoable; avoid long stretches with nothing runnable.
- DECISIONS.md gets an entry only for a decision not yet built, with
  its one-line summary added to the index in the same edit. When the
  code ships, drop the entry and record what was rejected, and why, in
  ALTERNATIVES.md.
- Keep docs in sync with actual project state (docs-as-code).
- Aim close to production grade, but don't over-engineer; advance by milestone.
- All project documentation is written in English (root docs, docs/, ADRs, README).

## Repository
Monorepo on pnpm workspaces + Turborepo: apps/ (user-facing clients),
services/ (backend + BFF), packages/ (shared code), infra/ (deployment).

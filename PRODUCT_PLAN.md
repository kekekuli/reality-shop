# Product Plan

## Project goal
Use an e-commerce site as the vehicle to fully explore and practice all
capability domains needed to "run a complete user-facing service." The
business itself is a means; the goal is to walk a real product's full
path from idea to users. Cloud-native/K8s is an important part but not
the only main line.

## Core principles
- Breadth first: open one complete end-to-end path, then deepen each domain.
- Every milestone must be demoable; never go long without something runnable.
- Stay as close to production grade as reasonable.
- Reuse existing assets (see "Existing environment" in ARCHITECTURE.md).

## Product shape
- A simplified e-commerce site. Category decided: single vertical —
  consumer electronics (3C), with the data model designed to be
  multi-category extensible (see ADR-008).
- Must support web and mobile (possibly desktop); approach in ARCHITECTURE.md.

## The eight capability domains (everything a user-facing service needs)
1. Product & requirements: requirement records, user journeys, flow charts, data model design
2. Application development: frontend (web + mobile), backend business logic, API/BFF, data layer
3. Data: modeling, migrations, mock data generation, consistency
4. Infrastructure & deployment: containerization, orchestration (Dokploy→K8s), CI/CD, environment management
5. Quality & reliability: testing, observability, alerting, SLOs
6. Security & compliance: authn/authz, data security, payment compliance, privacy
7. Operations & support: admin console, notification system, customer service
8. Growth & feedback: analytics events, business metrics, A/B testing

## Milestone roadmap (breadth first)
- M0  Product & design: category decision, user flows, business flow
      charts, data model, architecture sketch, README skeleton, refined
      multi-platform tech plan. No business code — design docs only.
- M1  Minimal end-to-end path: frontend → backend → PG → product list,
      deployed with Dokploy. Goal: a user can open a real URL in a
      browser and see the deployed product page.
- M2  Business loop: browse → cart → order → mock payment → order
      status → mock logistics + user auth (login/registration). Add the
      mock data generator.
- M3  Operations console: product/order/promotion management. Reuse
      Strapi for the content side; self-build transactional consoles
      (orders/inventory).
- M3.5 Mobile client: Expo/RN app replaying the M2 business loop on a
      second platform; codegen moves to packages/api-client.
- M4  Quality & observability: tests for core flows + OpenTelemetry
      into the existing OpenObserve; tracing and monitoring dashboards.
- M5  Infrastructure deepening: migrate/refactor the working system to
      K8s (k3s), microservice split, Helm, CI/CD, (optional) service
      mesh. Feel the PaaS vs K8s difference.
- M6  Security & productionization: HTTPS, secrets management, RBAC,
      rate limiting, backups, alerting, chaos drills.
- M7  Growth (optional): analytics events, business metrics dashboard,
      A/B testing prototype.

## Current status
- [x] Project direction settled
- [x] Tech architecture & repo organization settled
- [x] M0 product design (delivered: docs/m0/* + README + ADR-007…014)
- [x] M1 end-to-end path (web + api + PG, deployed via Dokploy)
- [ ] M2 business loop (scope: docs/m2/scope.md)

## Handoff notes for the M0 planning AI
Based on this file plus ARCHITECTURE.md and DECISIONS.md, help complete
M0 and deliver: ① e-commerce category decision (single vertical
preferred) ② core user journeys ③ core business flow charts ④ data
model design (core entities and relations: users/products/orders/
inventory/promotions) ⑤ refined frontend/backend & multi-platform tech
plan ⑥ README skeleton. No business code; design docs only.

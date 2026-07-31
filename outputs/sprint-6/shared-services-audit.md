# WPSC Shared Services Audit

Date: 2026-07-30

Product boundary: WordPress remains content authority. WPSC provides isolated
per-Site Runtime and shared platform capabilities that consume normalized
source content and publish static output.

| Service | Status | Evidence | Gap / next owner |
| --- | --- | --- | --- |
| Site and configuration | Partial | `site/`, `provision/`, Runtime config loader, Site repository | Separate workspace config from Site domain/webhook/settings; Sprint 7 foundation. |
| Content / Source | Partial | Source adapter contract, WordPress adapter, normalized content pipeline | Complete WordPress pages/posts/taxonomy coverage and provider-level contracts; Sprint 7. |
| Routing | Partial | `builder/router/`, route dependency graph, Runtime router | Permalink, redirect, canonical and Site-scoped route policy; Sprint 7. |
| Navigation | Partial | Content menu model, Theme/Builder rendering | WordPress menu retrieval and normalized navigation tree; Sprint 7. |
| Media | Partial | WordPress media normalization, asset download/rewrite pipeline | Media manifest, responsive metadata and source-to-media lifecycle; Sprint 7. |
| Search | Partial | Static index writer and browser search helpers | Query contract, per-Site index lifecycle and invalidation; Sprint 7. |
| Theme composition | Exists / partial | Theme resolver, templates, renderer, shared storefront theme | Formal rendering context and navigation composition contract; Sprint 7. |
| SEO | Partial | RankMath normalization, metadata, sitemap and robots writers | Open Graph, structured data and complete canonical policy; Sprint 8. |
| Publishing coordination | Exists / partial | Webhook -> Scheduler -> Queue -> Dispatcher -> Build; first-build controller | Content publish event contract from WordPress changes; Sprint 7. |
| Cache and performance | Partial | JSON/render/asset caches, incremental planner and invalidation | Source cache policy, service profile, retention and observability; Sprint 8. |
| Webhook and events | Exists / partial | Runtime receiver, registration controller, WordPress bridge, Scheduler handoff | Explicit idempotency and durable event audit; Sprint 8/9. |
| Account and identity | Partial | Auth bridge, WordPress auth service, customer session/account views | Commerce identity expansion belongs Sprint 8. |
| Storage | Partial | Site repository, Site path policy, Output Pipeline and Site storage folders | Formal storage service/retention and operational backup; Sprint 9. |
| Observability | Partial | Diagnostics, logger, build report/metrics, dashboard status | Persistent logs, health service, monitoring and audit trail; Sprint 9. |
| Multi-site foundation | Partial | Site UUID/repository/path policy/domain registry loader | Remove Site-specific runtime config and add multi-site operations; safe foundation Sprint 7, management Sprint 9. |

## Architecture Boundary Result

- Runtime remains Site Runtime owner.
- Scheduler owns policy; Queue owns Job lifecycle; Dispatcher executes Jobs.
- Builder owns static build semantics; Output Pipeline is the only filesystem
  publisher.
- Webhook remains a gateway into Scheduler.
- WordPress remains content management authority.
- Theme remains a presentation asset.

## Priority

Sprint 7 should complete the CMS-facing shared services that consume WordPress
content: Site configuration isolation, normalized Pages/Posts/Menus/Media,
routing, search, theme composition and publishing event coordination.
Sprint 8 adds experience/performance services. Sprint 9 adds operational and
multi-site management services.

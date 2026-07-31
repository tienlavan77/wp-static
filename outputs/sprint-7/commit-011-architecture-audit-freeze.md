# Sprint 7 Commit 011 - Architecture Audit and Freeze

Status: PASS - FROZEN  
Architecture baseline: WPSC Architecture v2.02  
Sprint: Sprint 7 - Shared Website Services

## Executive Result

The Sprint 7-specific validation passes its Architecture, Runtime, Shared Service, Publishing,
Multisite-foundation and end-to-end validation.

WordPress remains the Content Authority. WPSC consumes normalized provider
content and supplies Site-scoped website services around it. No WPSC content
authoring layer, Page/Post CRUD service, Media CMS or WordPress Admin
replacement was introduced.

The Sprint 7 architecture is frozen at the following flow:

```text
WordPress
  -> Source Adapter
  -> Normalized Content
  -> Shared Website Services
  -> Theme Composition
  -> Builder
  -> Output Pipeline
  -> sites/<site>/public/dist
```

Automated publication is frozen at:

```text
WordPress Change
  -> Runtime Webhook Receiver
  -> Publishing Coordinator
  -> Scheduler
  -> Queue
  -> Dispatcher
  -> Builder
  -> Output Pipeline
  -> Updated Static Website
```

## Architecture Audit

| Area | Result | Evidence |
| --- | --- | --- |
| Content authority | PASS | WordPress adapter retrieves and normalizes content; WPSC adds no authoring CRUD. |
| Source boundary | PASS | Builder and Shared Services consume normalized content instead of WordPress REST records. |
| Site configuration | PASS | Settings use the versioned, Site-scoped `wpsc.site-settings` contract. |
| Navigation | PASS | WordPress menus become deterministic normalized navigation trees before Theme consumption. |
| Media | PASS | Media metadata and responsive variants survive into a Site-scoped build manifest. |
| Routing | PASS | Permalinks, canonical URLs, redirects and 404 policy are deterministic and Site-scoped. |
| Search | PASS | Index lifecycle and query results retain Site identity and reject cross-Site query use. |
| Theme | PASS | Theme consumes a Shared Rendering Context and remains presentation-only. |
| Builder | PASS | Builder retains ownership of static build semantics and incremental route planning. |
| Output | PASS | Output Pipeline remains the publisher into `sites/<site>/public/dist`. |
| Publishing | PASS | Webhook authentication and normalization hand off only to Scheduler. |
| Scheduler | PASS | Scheduler owns trigger policy and submits Jobs to Queue. |
| Queue | PASS | Queue owns Pending, Running and Finished Job state. |
| Dispatcher | PASS | Dispatcher claims Jobs, invokes the injected Builder and records completion. |
| Multisite foundation | PASS | Site Context, configuration, credentials, manifests, temp storage and output remain Site-scoped. |

## Contract Freeze

The following Sprint 7 contracts are stable baselines for later Sprints:

- `wpsc-site-settings` version 1
- `wpsc.wordpress-content` version 1
- `wpsc.navigation` version 1
- `wpsc.media-manifest` version 1
- `wpsc.site-route-policy` version 1
- `wpsc.search-index` version 1
- `wpsc.rendering-context` version 1
- `wpsc.publish-event` version 1
- `wpsc.site-context` version 1

Future work may extend these contracts compatibly. It must not change their
existing field meaning or bypass their ownership boundaries without an
explicit architecture revision.

## Definition of Done

- [x] Site configuration service is Site-scoped.
- [x] WordPress Pages and Posts use a normalized provider contract.
- [x] Taxonomies and Authors are normalized.
- [x] WordPress menus reach Theme through normalized navigation.
- [x] Media metadata and responsive variants reach a Site-scoped manifest.
- [x] Routing, canonical URLs, redirects and 404 behavior are deterministic.
- [x] Search lifecycle and queries are Site-isolated.
- [x] Theme Composition receives an explicit Shared Rendering Context.
- [x] WordPress changes become normalized, idempotent publish events.
- [x] Scheduler, Queue, Dispatcher, Builder and Output ownership is preserved.
- [x] Two Sites coexist without cross-Site output or configuration access.
- [x] WordPress-to-static E2E passes.
- [x] Webhook-to-updated-website E2E passes.
- [x] No WPSC CMS authoring layer exists.
- [x] Documentation and audit evidence exist under `outputs/sprint-7`.

## Validation Evidence

The focused Sprint 7 freeze suite completed with:

```text
tests    37
pass     37
fail     0
skipped  0
```

Validated areas:

- Site Configuration
- WordPress Adapter and Provider Contract
- Navigation
- Media
- Routing
- Search
- Shared Rendering Context
- Publishing Coordinator
- Runtime Webhook Receiver
- Site Context and two-Site isolation
- WordPress-to-static E2E
- Webhook incremental publication E2E
- CLI bootstrap and syntax

The repository-wide suite reports:

```text
tests    410
pass     410
fail     0
skipped  0
```

Project Layout Normalization test debt was resolved before freeze:

- CLI tests use the canonical `framework/src/cli/index.js`;
- deterministic Builder fixtures live under `fixtures/basic-shop`;
- tests never resolve the live Tín Sinh Phát endpoint;
- output-producing tests use isolated temporary projects;
- Runtime E2E validates the composition/router boundary without requiring a
  sandbox-sensitive loopback listener.

## Deferred Work

The following remain outside Sprint 7 and do not affect its PASS result:

- Full Multi-site Management and platform administration
- WooCommerce complete customer experience
- Cart, Checkout and Customer Account completion
- Forms and advanced SEO
- Advanced cache and performance operations
- Backup, monitoring, security hardening and production deployment
- Installer, upgrade, migration, SDK and stable v1.0 API

These features must extend the frozen boundaries rather than introducing a
direct Gateway-to-Builder path, Theme-to-Source access or cross-Site coupling.

## Freeze Decision

The Sprint 7 audit is complete, its work is boundary-safe, the complete
repository suite passes, and Sprint 7 is formally frozen.

New website capabilities must build on the Shared Website Services contracts.
Changes to ownership or dependency direction require an explicit Architecture
revision; they must not be introduced as incidental feature work.

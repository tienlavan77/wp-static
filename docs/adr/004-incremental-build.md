# ADR 004 - Incremental Build

Status: `Accepted for WPSC v1`

## Decision

WPSC v1 supports incremental builds by planning affected routes from changed
source items and rewriting only the affected HTML pages plus shared artifacts
that must remain consistent.

The build pipeline keeps these concepts separated:

- `graph`: route/content dependency relationships
- `planner`: changed item parsing and affected route planning
- `queue`: serialized rebuild requests
- `invalidate`: fresh build/cache invalidation policy
- `progress`: build progress events
- `webhook`: source change receiver
- `builder`: artifact writer

## Context

The project must support real WordPress/WooCommerce editing. A single product,
category, post, page, or menu change should not always require a full-site
rebuild.

At the same time, WPSC static output includes related artifacts such as route
JSON, fragments, search index, sitemap, manifests, and copied runtime assets.
Incremental build cannot mean "only write one HTML file" if related artifacts
would become stale.

## Alternatives Considered

### Always full build

Rejected for real stores because it becomes slower as catalog size grows and
makes editor feedback feel delayed.

### Blindly rebuild only the changed slug

Rejected because category archives, search index, sitemap, fragments, and
related product/category routes can become stale.

### Plan affected routes and refresh shared outputs

Accepted because it keeps editor feedback fast while preserving static output
correctness.

## Consequences

- Webhook rebuilds can respond quickly and process work through a queue.
- A changed product may affect product route, archives, search data, sitemap,
  and fragments.
- A changed category may affect archive route and related child/parent archive
  contexts.
- Route render cache must be invalidated when source data or render shell
  changes.
- Some full-build fallback remains necessary when dependency scope is unknown.

## Links

- `docs/architecture-boundary.md`
- `docs/public-contracts.md`
- `docs/incremental-build.md`
- `docs/performance-cache.md`
- `docs/webhook-rebuild-workflow.md`


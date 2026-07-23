# ADR 003 - Theme Contract

Status: `Accepted for WPSC v1`

## Decision

WPSC themes render static HTML from a stable layout context:

```js
{
  components,
  content,
  graph,
  html,
  route,
  site,
  theme
}
```

Themes may define fallback layouts, content-type layouts, components, assets,
blocks, and metadata through the v1 theme config contract.

Themes must not fetch WordPress/WooCommerce data directly or read runtime
private session data during build.

## Context

WPSC needs hard-coded storefront themes now, visual builder themes later, and
eventually user-created/uploaded themes. To support all of those, theme code
must rely on a stable public render context instead of private Core internals.

## Alternatives Considered

### Let themes import any Core module

Rejected because it makes theme reuse fragile. Internal refactors would break
themes and block v1 evolution.

### Let themes fetch source API data directly

Rejected because it duplicates adapter work and leaks source coupling into
presentation code.

### Freeze a small layout context

Accepted because it gives themes enough data to render rich storefront pages
while preserving subsystem boundaries.

## Consequences

- Theme authors can build layouts and components against stable fields.
- Core can refactor adapters, cache, routing, and runtime without changing
  theme code when public context stays compatible.
- Rich product/category/account/search markup should be built from normalized
  content, graph, and route data.
- Future builder templates should compile into the same theme/render contract.

## Links

- `docs/architecture-boundary.md`
- `docs/public-contracts.md`
- `docs/theme-system.md`
- `docs/v1-theme-api.md`


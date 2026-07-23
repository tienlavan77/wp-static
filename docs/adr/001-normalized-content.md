# ADR 001 - Normalized Content

Status: `Accepted for WPSC v1`

## Decision

WPSC v1 uses normalized content, terms, media, menus, SEO, and commerce data as
the only data shape that the compiler, router, theme system, route JSON, and
fragments may rely on.

Source adapters are responsible for converting WordPress, WooCommerce, mock, or
custom CMS records into WPSC normalized data before routes or themes see them.

## Context

WPSC needs to support WordPress pages/posts, WooCommerce products/categories,
custom taxonomies, Rank Math-style SEO data, menu data, media assets, product
variations, and future CMS sources.

If theme and compiler code read raw WordPress or WooCommerce response shapes
directly, every new source or source change would force Core/theme changes.

## Alternatives Considered

### Let themes read raw source data

Rejected because it couples every theme to a source implementation. A theme
would need to know WordPress, WooCommerce, Rank Math, and ACF details.

### Use one source-specific model per adapter

Rejected because the compiler and router would need branching logic per source.
That makes source expansion expensive and risks route behavior differences.

### Normalize everything at adapter boundary

Accepted because it keeps source knowledge inside Adapter Layer and lets the
rest of WPSC operate on stable contracts.

## Consequences

- Adapter authors must normalize source data carefully.
- Compiler, router, builder, runtime route data, and themes can stay source-agnostic.
- Source-specific fields may still exist under `data` when useful, but stable
  WPSC fields must remain available.
- Product variations stay embedded in the parent product model for public
  routing and product detail rendering.

## Links

- `docs/architecture-boundary.md`
- `docs/public-contracts.md`
- `docs/content-graph.md`
- `docs/public-route-data.md`


# Shared Storefront Theme Contract

## Ownership

`themes/storefront/` is the canonical shared Storefront Theme. The copy in
`fixtures/basic-shop/themes/` remains a demo fixture during the compatibility
migration and is not the Runtime import path.

## Builder V1 Integration

Runtime creates a Builder V1 configuration pointing to this directory:

```text
theme.layout
theme.layouts
theme.blocks
theme.components
theme.assets
theme.publicDir
```

Builder V1 resolves a route's template/layout before rendering. The theme
receives only finalized Content Model data, graph data, and the current route.

The theme must not read a Source, Build Context, Setup state, credentials, or
Runtime configuration.

## Output Boundary

The theme returns logical HTML only. Builder V1 writes to per-build staging.
Runtime Output Pipeline is the only component that publishes staged files to a
Site's `public/dist` directory.

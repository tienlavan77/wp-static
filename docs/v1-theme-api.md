# V1 Theme API

Status: stable in WPSC v1.0.

Themes define how WPSC renders content routes and builder layouts.

## Stable Config Fields

The v1 theme config freezes these fields:

- `layout`: fallback layout module.
- `layouts`: map of content type to layout module.
- `components`: reusable component module.
- `assets`: theme asset directory copied to `dist/theme`.
- `blocks`: theme block library for the visual builder.
- `meta`: theme metadata.

The same list is exported as `V1_THEME_CONFIG_FIELDS` from the root package.

## Stable Layout Context

Every layout receives a single object with:

- `components`
- `content`
- `graph`
- `html`
- `route`
- `site`
- `theme`

The same list is exported as `V1_THEME_LAYOUT_CONTEXT_FIELDS`.

## Layout Resolution

For each content route, WPSC resolves layouts in this order:

1. `theme.layouts[content.type]`
2. `theme.layout`

This resolution order is part of the v1 theme contract.

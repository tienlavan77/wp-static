# Theme System

WPSC themes can define a fallback layout, layouts by content type, reusable components,
theme assets, and metadata.

Status: v1 stable.

## Config

```js
export default {
  theme: {
    layout: "./theme/layout.js",
    layouts: {
      page: "./theme/layouts/page.js",
      product: "./theme/layouts/product.js"
    },
    components: "./theme/components/index.js",
    assets: "./theme/assets",
    meta: {
      name: "Basic Commerce Theme",
      version: "0.1.0",
      description: "Theme vi du cho WPSC"
    }
  }
};
```

## Layout Resolution

For each route, WPSC resolves the layout in this order:

1. `theme.layouts[content.type]`
2. `theme.layout`

This keeps custom product/page templates simple while preserving one required fallback.

## Layout Context

Each layout receives:

```js
export default function productLayout({ components, content, graph, html, route, site, theme }) {
  return html`<main>${content.title}</main>`;
}
```

The v1 layout context fields are frozen and exported from the root package as
`V1_THEME_LAYOUT_CONTEXT_FIELDS`.

## Components

`theme.components` points to a module that exports a plain object. Layouts can call those
helpers through the `components` context. Component helpers should return values for the
layout template to render. Template values are HTML-escaped by default.

## Assets

Files in `theme.assets` are copied to `dist/theme`. Public assets are still copied to the
root of `dist`.

## Stable Theme Config Fields

The v1 theme config fields are `layout`, `layouts`, `components`, `assets`, `blocks`,
and `meta`. They are exported from the root package as `V1_THEME_CONFIG_FIELDS`.

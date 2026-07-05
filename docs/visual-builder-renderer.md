# Visual Builder Renderer

Phase 25 renders saved layout JSON into static HTML.

## Basic Render

```js
const result = renderLayout(layout, {
  content,
  graph,
  site,
  theme
});
```

The result contains:

- `html`: static markup.
- `errors`: non-fatal render errors, such as missing blocks.
- `layout`: normalized layout document.

Sections render as `section.wpsc-section`. Block nodes are resolved through the block registry and rendered with the existing block schema system.

## Content Binding

Layout blocks can bind saved props to content data:

```json
{
  "type": "block",
  "blockName": "core/heading",
  "bindings": {
    "text": {
      "source": "content",
      "path": "data.title"
    }
  }
}
```

The renderer normalizes common content fields into `content.data`, so `title`, `description`, and `content` can be used by builder blocks consistently.

## Product Blocks

Commerce blocks can read product data from `content.data`. For example, `commerce/product-price` reads `data.price` and renders formatted VND output by default.

## Taxonomy Blocks

Archive blocks can read taxonomy/archive data from `content.data`. For example, `commerce/archive-links` reads `data.archiveLinks` and preserves the project URL contract: `domain/slug`, with no taxonomy base and no trailing slash.

## Missing Data Fallbacks

Missing blocks are non-fatal. By default they render empty HTML and return an error object. Use `showFallbacks: true` in preview/debug contexts to emit a visible fallback marker.

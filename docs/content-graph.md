# Content Graph

Status: `Draft`

The content graph gives themes and later SEO systems a stable way to look up
normalized content without calling adapters directly.

```js
const graph = createContentGraph({
  contents,
  terms,
  media,
  menus
});
```

## Lookups

```js
graph.findContentById("product-1");
graph.findContentBySlug("iphone-15");
graph.findContentsByType("product");
graph.findContentsByTerm("dien-thoai");
```

## Collections

```js
graph.contents.items;
graph.terms.items;
graph.media.items;
graph.menus.items;
```

The graph is immutable and adapter-agnostic. WordPress and WooCommerce data
must be normalized before entering the graph.

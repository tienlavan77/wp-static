# Taxonomy Archives

Phase 19 adds archive route generation for taxonomy terms already present in the content graph.

## Default Routes

| Taxonomy | Route format | Content types |
| --- | --- | --- |
| `category` | `/{slug}` | `post`, `page` |
| `post_tag` | `/{slug}` | `post`, `page` |
| `product_cat` | `/{slug}` | `product` |
| `product_tag` | `/{slug}` | `product` |

Generated archive routes keep the no-trailing-slash contract:

```txt
/dien-thoai
/dien-thoai/page/2
```

The build output for those routes is:

```txt
dien-thoai.html
dien-thoai/page/2.html
```

## Route Data

Each archive route has `route.type = "archive"` and a virtual content object:

```js
{
  type: "archive:product_cat",
  data: {
    items: [],
    pagination: {
      page: 1,
      pageCount: 1,
      path: "/dien-thoai"
    },
    term: {
      slug: "dien-thoai",
      taxonomy: "product_cat"
    }
  }
}
```

Themes can add layouts for taxonomy-specific archive types:

```js
export default {
  theme: {
    layout: "./theme/layout.js",
    layouts: {
      "archive:product_cat": "./theme/layouts/product-category.js"
    }
  }
};
```

## Custom Archive Config

Use `archives` in `wpsc.config.js` to customize pagination and labels:

```js
export default {
  archives: {
    product_cat: {
      contentTypes: ["product"],
      pageSize: 24,
      titlePrefix: "Danh mục"
    }
  }
};
```

Set `archives: false` to disable archive generation.

Archive routes are normal site routes, so they are included in rendered pages, the build manifest, and `sitemap.xml`.

The default public URL contract is always `domain/slug`. If a taxonomy term slug conflicts with a page, post, product, or another term archive, WPSC fails the build with a duplicate route error so the slug can be fixed at the source.

# Taxonomy Archives

Phase 19 adds archive route generation for taxonomy terms already present in the content graph.

## Default Routes

| Taxonomy | Route base | Content types |
| --- | --- | --- |
| `category` | `/category/{slug}` | `post`, `page` |
| `post_tag` | `/tag/{slug}` | `post`, `page` |
| `product_cat` | `/product-category/{slug}` | `product` |
| `product_tag` | `/product-tag/{slug}` | `product` |

Generated archive routes keep the no-trailing-slash contract:

```txt
/product-category/dien-thoai
/product-category/dien-thoai/page/2
```

The build output for those routes is:

```txt
product-category/dien-thoai.html
product-category/dien-thoai/page/2.html
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
      path: "/product-category/dien-thoai"
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

Use `archives` in `wpsc.config.js` to customize route base and pagination:

```js
export default {
  archives: {
    product_cat: {
      basePath: "danh-muc",
      contentTypes: ["product"],
      pageSize: 24,
      titlePrefix: "Danh mục"
    }
  }
};
```

Set `archives: false` to disable archive generation.

Archive routes are normal site routes, so they are included in rendered pages, the build manifest, and `sitemap.xml`.

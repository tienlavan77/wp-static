# WooCommerce Adapter Guide

Status: v1 stable adapter.

The WooCommerce adapter follows this layer order:

```text
WooCommerce REST API
-> Client
-> Repository
-> Normalizer
-> Content
```

## Config

```js
export default {
  adapter: {
    type: "woocommerce",
    baseUrl: "https://shop.example.com",
    consumerKey: "ck_...",
    consumerSecret: "cs_...",
    includeCategories: true,
    includeTags: true,
    includeVariations: true,
    seo: {
      provider: "rankmath"
    }
  }
};
```

## Product Content

Products are normalized into `Content`:

```js
{
  id: "product-44",
  type: "product",
  title: "Áo thun basic",
  slug: "ao-thun-basic",
  domain: "woocommerce",
  data: {
    price: 249000,
    regularPrice: 299000,
    salePrice: 249000,
    sku: "TS-BASIC-WHT",
    inStock: true,
    categories: [],
    tags: [],
    images: [],
    variations: []
  },
  seo: {}
}
```

Rank Math fields are normalized into `content.seo`, the same shape used by the
WordPress adapter.

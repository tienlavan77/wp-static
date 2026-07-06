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
    variants: [],
    variations: []
  },
  seo: {}
}
```

Rank Math fields are normalized into `content.seo`, the same shape used by the
WordPress adapter.

When `includeVariations` is enabled, WooCommerce variation records are fetched and
normalized into `data.variants`. WPSC keeps the raw `data.variations` value for reference.
Variants do not create their own static routes; they are exposed through the parent
product route data JSON.

## With WordPress Content

For stores that need WooCommerce products plus WordPress pages, posts, menus, media, ACF,
and SEO in the same build, use `adapter.type: "wordpressWooCommerce"` instead of choosing
only `woocommerce`.

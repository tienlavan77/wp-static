# WordPress Adapter Guide

Status: v1 stable adapter.

The WordPress adapter follows this layer order:

```text
WordPress REST API
-> Client
-> Repository
-> Normalizer
-> Content
```

Renderer, Router, and Builder must not call WordPress directly.

## Config

```js
export default {
  adapter: {
    type: "wordpress",
    baseUrl: "https://example.com",
    contentTypes: ["pages", "posts"],
    customPostTypes: ["du-an"],
    taxonomies: ["categories", "tags"],
    includeMedia: true,
    includeMenus: true,
    includeAcf: true,
    seo: {
      provider: "rankmath"
    }
  }
};
```

## Rank Math

Rank Math fields are normalized into `content.seo`:

```js
{
  seo: {
    title: "...",
    description: "...",
    canonical: "...",
    robots: ["index", "follow"],
    focusKeyword: "...",
    openGraph: {
      title: "...",
      description: "...",
      image: "..."
    },
    twitter: {
      title: "...",
      description: "...",
      image: "..."
    }
  }
}
```

The SEO output system should only read `content.seo`; it should not know about
Rank Math meta keys.

## ACF

ACF fields are copied into:

```js
content.data.acf
```

## Featured Media And Terms

When `_embed` data is available:

```js
content.data.featuredImage
content.data.terms
```

## Pagination

The client follows the `x-wp-totalpages` response header and requests all
pages with `per_page=100`.

## With WooCommerce

For stores that need WordPress content and WooCommerce products in the same build, use
`adapter.type: "wordpressWooCommerce"` instead of choosing only `wordpress`.

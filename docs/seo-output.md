# SEO Output System

Status: `Draft`

The SEO output system reads normalized `content.seo` data. It does not know
about Rank Math, Yoast, WooCommerce, or WordPress meta keys.

## Data Flow

```text
Adapter normalizer
-> content.seo
-> renderSeoTags()
-> HTML head
```

## Supported Output

- `<title>`
- Meta description
- Canonical link
- Robots meta
- Open Graph tags
- Twitter Card tags
- `sitemap.xml`
- `robots.txt`

## Site Fallbacks

Project config can define:

```js
export default {
  site: {
    url: "https://example.com",
    title: "Example",
    description: "Default description",
    robots: ["index", "follow"]
  }
};
```

If `content.seo` is missing, WPSC falls back to content title/description and
then site defaults.

# Incremental Build

Phase 21 adds the first incremental build engine. WPSC can parse changed source items, build a route dependency graph, and rewrite only affected HTML pages while refreshing shared outputs.

## CLI

```sh
node src/cli/index.js build --project examples/basic-shop --changed product:iphone-15
node src/cli/index.js build --project examples/basic-shop --changed term:product_cat:dien-thoai
node src/cli/index.js build --project examples/basic-shop --changed menu:primary
```

The `--changed` flag can be repeated:

```sh
node src/cli/index.js build \
  --project examples/basic-shop \
  --changed product:iphone-15 \
  --changed term:product_cat:thoi-trang
```

Changed item formats:

| Format | Meaning |
| --- | --- |
| `product:iphone-15` | Product by id or slug |
| `post:tin-moi` | Post by id or slug |
| `page:gioi-thieu` | Page by id or slug |
| `term:product_cat:dien-thoai` | Taxonomy term by taxonomy and slug |
| `menu:primary` | Menu change, affects all routes |
| `theme:layout` | Theme change, affects all routes |

## URL Contract

Incremental route hints use the same public URL rule as the rest of WPSC: `domain/slug`.

Example:

```txt
term:product_cat:dien-thoai -> /dien-thoai
```

No taxonomy base is added to public URLs.

## Dependency Rules

- A changed product rebuilds its own route and any archive route that contains it.
- A changed page or post rebuilds its own route and related archives.
- A changed term rebuilds its archive route.
- A changed menu, media item, or theme file rebuilds all routes.
- Shared files such as `sitemap.xml`, `robots.txt`, asset manifest, and build manifest are refreshed after each build.

## Manifest

`.wpsc/manifest.json` now includes an `incremental` section:

```json
{
  "incremental": {
    "fullBuild": false,
    "changedRoutes": ["/iphone-15", "/dien-thoai"],
    "pagesWritten": 2,
    "totalPages": 6,
    "inputHash": "..."
  }
}
```

## Demo Visibility

The Basic Shop homepage links to generated archive routes such as `/dien-thoai` and `/thoi-trang`, so new public routes can be checked directly in the browser.

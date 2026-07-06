# Public Route Data

WPSC writes one public JSON payload for every public HTML route.

## Output Shape

```text
dist/
  page.html
  data/
    manifest.json
    routes/
      index.json
      page.json
      product-slug.json
```

Route data follows the same URL contract as HTML routes:

```text
/slug
/data/routes/slug.json
```

The homepage route writes:

```text
/data/routes/index.json
```

## Payload Contract

Every route JSON includes:

- `route`: route path, output file, and content id.
- `site`: public site metadata.
- `content`: full public content data.
- `content.seo`: source SEO fields.
- `content.media`: featured image and gallery.
- `content.taxonomies`: categories, tags, and terms.
- `content.commerce`: public commerce fields for product pages.
- `content.variants`: product variants for option selection.
- `graph`: related content, menus, and terms.
- `seo`: normalized SEO metadata used by renderers.
- `assets`: images referenced by the route.
- `runtime`: public endpoints and route data URL.

## WooCommerce Variants

WooCommerce variations are normalized into the parent product `content.variants` array.
They do not create standalone static routes. Customers choose variants on the parent
product page before adding the item to the cart.

## Safety Boundary

Route data is public. It must not include:

- WooCommerce consumer secrets.
- WordPress application passwords or bearer tokens.
- customer sessions.
- orders or account data.
- internal cost or private operational fields.

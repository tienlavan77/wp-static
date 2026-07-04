# Webhook Rebuild Workflow

Phase 20 adds a small webhook receiver for editor workflows. WordPress or WooCommerce can call WPSC after content changes, and WPSC runs a guarded rebuild.

## Start The Receiver

```sh
WPSC_WEBHOOK_SECRET=change-me node src/cli/index.js webhook --project examples/basic-shop --port 8787
```

The endpoint is:

```txt
POST /webhook/rebuild
```

Send the shared secret in a header:

```txt
x-wpsc-webhook-secret: change-me
```

## Payload

WordPress page/post save:

```json
{
  "source": "wordpress",
  "action": "publish",
  "eventId": "wp-123",
  "changed": [
    {
      "type": "page",
      "id": 10,
      "slug": "gioi-thieu"
    }
  ]
}
```

WooCommerce product save:

```json
{
  "source": "woocommerce",
  "action": "update",
  "eventId": "woo-456",
  "changed": [
    {
      "type": "product",
      "id": 44,
      "slug": "iphone-15"
    }
  ]
}
```

Taxonomy term save:

```json
{
  "source": "wordpress",
  "action": "update",
  "changed": [
    {
      "taxonomy": "product_cat",
      "id": 7,
      "slug": "dien-thoai"
    }
  ]
}
```

The receiver normalizes slugs without leading or trailing `/`. Route hints always follow the public URL contract: `domain/slug`.

## Queue Guard

Webhook rebuilds are serialized. If another webhook arrives while a build is running, WPSC returns `202` and keeps one queued rebuild. That prevents overlapping builds from writing the same `dist` directory at the same time.

Phase 21 can use the changed item list to rebuild affected routes and related shared outputs.

## Editor Workflow

1. Editor saves a page, product, term, menu, or media item.
2. WordPress or WooCommerce sends a webhook to WPSC.
3. WPSC validates the shared secret.
4. WPSC normalizes changed items and runs the guarded rebuild queue.
5. Generated HTML, manifest, `sitemap.xml`, and `robots.txt` are refreshed.

## Validation Report

Every `buildProjectOnce` result now includes `report`, which is meant for CI and webhook logs:

```js
{
  ok: true,
  issueCount: 0,
  routeCount: 6,
  issues: []
}
```

The first validation checks focus on route safety, including duplicate public paths. This matters because WPSC intentionally keeps URLs as `domain/slug`; conflicting page/product/term slugs should fail early.

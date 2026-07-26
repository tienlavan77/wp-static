# WPSC Webhook Bridge

WordPress plugin that sends content-change webhooks from WordPress/WooCommerce to a
WPSC webhook rebuild receiver.

## What It Sends

The plugin watches:

- post/page/custom post type publish/update/trash/delete
- WooCommerce product publish/update/trash/delete
- WooCommerce product variation publish/update/trash/delete, mapped back to its parent product
- term/category/tag/product_cat/product_tag create/update/delete

It sends a WPSC-compatible payload:

```json
{
  "source": "woocommerce",
  "action": "update",
  "eventId": "wpsc_123_abc",
  "changed": [
    {
      "type": "product",
      "id": 44,
      "slug": "danh-thiep",
      "taxonomy": null
    }
  ]
}
```

## Configure

Add these constants to `wp-config.php`:

```php
define('WPSC_WEBHOOK_TARGET_URL', 'http://127.0.0.1:8787/webhook/rebuild');
define('WPSC_WEBHOOK_SECRET', 'replace-with-a-long-random-secret');
```

Optional constants:

```php
define('WPSC_WEBHOOK_DEBOUNCE_SECONDS', 8);
define('WPSC_WEBHOOK_TIMEOUT_SECONDS', 8);
define('WPSC_WEBHOOK_ENABLED', true);
define('WPSC_WEBHOOK_SEND_IMMEDIATELY', true);
```

Use `WPSC_WEBHOOK_SEND_IMMEDIATELY` during local development when you want WordPress
save actions to notify WPSC immediately. Leave it disabled in production if you want
WP-Cron debounce to group multiple editor saves into one rebuild.

The secret must match the WPSC receiver:

```bash
WPSC_WEBHOOK_SECRET=replace-with-a-long-random-secret node src/cli/index.js webhook --project examples/basic-shop --port 8787
```

## Install

Copy the folder to WordPress:

```bash
rsync -av integrations/wordpress/wpsc-webhook-bridge/ tienlavan@192.168.1.181:/DUONG_DAN_WORDPRESS/wp-content/plugins/wpsc-webhook-bridge/
```

Then activate in WordPress Admin:

```text
Plugins -> WPSC Webhook Bridge -> Activate
```

## REST Status

Status endpoint:

```text
GET /wp-json/wpsc/v1/webhook/status
```

Manual test endpoint:

```bash
curl -X POST https://api.tinsinhphat.com/wp-json/wpsc/v1/webhook/test \
  -H 'content-type: application/json' \
  -H 'x-wpsc-webhook-secret: replace-with-a-long-random-secret'
```

## Notes

- The plugin does not store WPSC secrets in the database.
- Failed sends are stored in an option for inspection.
- Events are debounced through WP-Cron to avoid multiple rebuilds from one editor save.

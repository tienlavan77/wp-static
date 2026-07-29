# WordPress Runtime Source Adapter

Runtime Source type is `wordpress`; its endpoint is the WordPress root URL,
such as `https://cms.example.test`, never `/wp-json`.

Credentials are server-only environment variables:

```text
WPSC_WP_USERNAME=runtime-editor
WPSC_WP_APP_PASSWORD=application-password
```

The adapter uses WordPress REST for health/authentication and content reads.
WPSC Webhook Bridge is configuration-driven: set its target URL and secret in
WordPress, then the adapter checks `GET /wp-json/wpsc/v1/webhook/status` and
verifies the path with `POST /wp-json/wpsc/v1/webhook/test`.

# Setup Diagnostics Contract

## Purpose

Setup Service, REST API, Browser Wizard, and CLI share diagnostics without a
client-specific translation layer.

```json
{
  "code": "setup.context.site_id.required",
  "message": "Setup context site id is required.",
  "severity": "error"
}
```

## Invariants

- `code` is a stable machine-readable identifier.
- `message` is the service-provided user-facing explanation.
- `severity` is `error`, `warning`, or `info` where applicable.
- Browser and CLI may choose layout, but must not rename fields, replace codes,
  or infer business decisions from diagnostics.

API responses keep diagnostics under `diagnostics.errors` and
`diagnostics.warnings`.

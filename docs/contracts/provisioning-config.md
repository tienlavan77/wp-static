# Provisioning Config Contract

## Purpose

`createProvisioningConfig()` produces the site-local configuration contract
used by provisioning and future setup consumers. It is not a public browser
payload and must never be written into `public/` or `public/dist/`.

## Shape

```json
{
  "schema": "provisioning-config",
  "schemaVersion": 1,
  "frameworkVersion": "2.0.0",
  "createdAt": "2026-07-27T00:00:00.000Z",
  "site": {
    "id": "company-a",
    "name": "Company A"
  },
  "environment": {},
  "source": {},
  "secrets": {}
}
```

`schemaVersion` versions this document's data format. `frameworkVersion`
identifies the framework that created it; the fields must not be conflated.

## Invariants

- `schema` must equal `provisioning-config`.
- `schemaVersion` must equal `1` for the current contract.
- `site.id` and `site.name` are required non-empty strings.
- `environment`, `source`, and `secrets` must be objects.
- `frameworkVersion` is a string when supplied, otherwise `null`.
- The returned config and all nested values are deeply frozen.

Consumers needing a change must clone, modify, validate, freeze, and replace
the config. They must not mutate the active instance.

## Security Boundary

The `secrets` field contains server-side secret records. Browser, static build
output, dashboard responses, and logs must not expose secret values. A future
persisted representation must use an approved private secret provider.

## Future Extensions

`configHash` is intentionally not part of schema version 1. It may be added in
a later schema version for manual-edit detection, configuration comparison, and
`wpsc doctor` support.

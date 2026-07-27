# Provisioning Secret Provider Contract

## Purpose

The Provisioning Engine creates site-local secrets through a provider contract
so it can later support rotation and external backends without coupling the
engine to one storage implementation.

## Secret Types

- `siteSecret`
- `webhookSecret`
- `sessionSecret`
- `authBridgeSecret`

## Provider Interface

```js
{
  type: "random",
  create(type, options),
  rotate(type)
}
```

The default provider uses `crypto.randomBytes` and produces a metadata-rich
record:

```json
{
  "metadata": {
    "algorithm": "random-256",
    "createdAt": "2026-07-27T00:00:00.000Z",
    "type": "webhookSecret",
    "version": 1
  },
  "value": "server-only-secret-value"
}
```

## Security Invariants

- Never use `Math.random` for provisioning secrets.
- Never log, emit in provisioning events, or expose secret values to browser
  code or static output.
- Validate every expected secret type and its metadata before consumption.
- A future Vault, AWS Secrets Manager, or Azure Key Vault provider must keep
  this record contract or provide an explicit versioned migration.

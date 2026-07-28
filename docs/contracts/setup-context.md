# Setup Context Contract

## Purpose

`SetupContext` is immutable business input for one setup operation. It is
created and validated by Setup Service before a runtime session is created.

```json
{
  "client": "browser",
  "siteId": "company-a"
}
```

## Invariants

- `client` is one of the closed SetupClient values: `browser`, `cli`, or
  `dashboard`.
- `siteId` is a non-empty string.
- The context is deeply frozen after normalization.
- A context does not contain session IDs, workflow state, progress, secrets,
  source credentials, or persisted configuration.

Browser and CLI provide input; Setup Service creates the resulting context.

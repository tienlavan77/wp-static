# Setup Session Contract

## Purpose

`SetupSession` is a runtime-only snapshot owned by Setup Service and its
Session Manager. It is not browser state or site configuration.

```json
{
  "id": "UUID-v4",
  "context": {
    "client": "cli",
    "siteId": "company-a"
  },
  "currentStateId": "NOT_STARTED",
  "createdAt": "2026-07-28T00:00:00.000Z",
  "updatedAt": "2026-07-28T00:00:00.000Z",
  "endedAt": null,
  "expiresAt": null,
  "version": "1.0"
}
```

## Invariants

- `id` is a framework-compatible UUID v4.
- `currentStateId` is a snapshot only; Session Manager does not own state
  enums, transition tables, or workflow rules.
- `expiresAt` is reserved for a later expiration policy; no expiration behavior
  is implemented in Sprint 6.
- Session snapshots are immutable and replaced rather than mutated.
- Repository adapters implement `create`, `find`, `list`, and `delete`.

The default repository is Map-backed. A future Redis adapter must preserve this
contract without changing Setup Service clients.

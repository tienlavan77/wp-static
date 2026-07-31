# Sprint 7 Freeze Maintenance

Status: PASS

## Purpose

Resolve repository test debt discovered during Commit 011 without changing
Runtime, Builder, Scheduler or Shared Service business logic.

## Changes

- Replaced stale CLI test paths with `framework/src/cli/index.js`.
- Moved deterministic Builder material to `fixtures/basic-shop`.
- Removed test dependency on the live Tín Sinh Phát WordPress endpoint.
- Isolated output-producing CLI and storefront tests in temporary projects.
- Updated assertions to the current Content Model, diagnostics and asset
  contracts.
- Made Runtime E2E validate provisioning, domain resolution, setup, source,
  webhook and publication through the Runtime composition/router boundary
  without requiring sandbox-sensitive network listeners.
- Updated project documentation and tooling references away from
  `examples/basic-shop`.

## Validation

```text
tests    410
pass     410
fail     0
skipped  0
```

Sprint 7 has no remaining test blocker.

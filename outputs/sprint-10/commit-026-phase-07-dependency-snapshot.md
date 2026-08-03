# Sprint 10 Commit 026 - Phase 07 Dependency Snapshot Verification

Status: PASS

## Scope

After an initial full Runtime publish, validate the persisted dependency
snapshot at `storage/build/dependency-manifest.json`.

The dedicated Runtime E2E asserts:

- schema, schema version, Site ID and published Build ID;
- `contentToRoutes` and `routeToDependencies` structures;
- Product A (`product-a`) resolves to its Product route;
- Product A resolves to its Featured archive route;
- Product A resolves to the Shared Storefront Homepage, because that page
  renders the fixture Product card.

The manifest is read only after the Scheduler reports a successful publish;
the test does not manufacture or call the dependency store directly.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 7 persists a dependency snapshot only after Runtime publish (948.340842ms)
7 passed, 0 failed
```

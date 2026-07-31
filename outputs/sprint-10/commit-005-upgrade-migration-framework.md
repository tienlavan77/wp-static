# Sprint 10 Commit 005 - Upgrade / Migration Framework

Status: PASS

## Delivered

- Added the versioned `wpsc.product-migration` contract.
- Added ordered version-to-version Migration Planning.
- Added dry-run planning without configuration mutation.
- Added idempotent migration execution with completed migration tracking.
- Added persistent migration state and failure checkpoints.
- Added retry after a failed migration checkpoint.
- Added configuration persistence after each successful migration step.

## Upgrade Flow

```text
Current Product Version
    -> Migration Planner
    -> Ordered migrations
    -> Checkpoint after each step
    -> Configuration validation (C006)
    -> New Product Version
```

## Safety Invariants

- A migration requires explicit `id`, `fromVersion`, `toVersion` and handler.
- No ordered path means no mutation.
- `--dry-run` produces a plan only.
- A completed migration is skipped on retry.
- A failed migration checkpoint remains observable and can be retried.
- Migration handlers receive Product configuration and workspace context only.
- Provider credentials, WordPress data and WooCommerce data are outside the
  Migration context and cannot be migrated by this framework.

## Persistent State

```text
storage/migrations/product.json
```

This state records completed migration IDs, current version, failure checkpoint
and update time. Product configuration is updated atomically at:

```text
config/wpsc.json
```

## Validation

```bash
node --test test/productMigrationService.test.js test/installationBootstrapService.test.js test/productManifest.test.js test/sprint9ProductionOperationsE2E.test.js
git diff --check
```

Migration, Bootstrap, Product and Sprint 9 regression validation passed with
7 tests.

## Architecture Result

Commit 005 introduces recoverable WPSC Product schema/configuration migration
only. It does not migrate provider data, invoke Build, change Scheduler policy
or alter Site isolation. Configuration Validation remains Commit 006.

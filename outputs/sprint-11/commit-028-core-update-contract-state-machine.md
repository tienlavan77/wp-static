# Core Update C028 - Contract and State Machine

## Delivered

- Added Product-owned `CoreUpdateService` with a durable Site-independent Core Update record.
- Added the explicit lifecycle: `IDLE -> CHECKING -> PLANNED -> DOWNLOADING -> VERIFIED -> BACKING_UP -> STAGING -> MIGRATING -> VALIDATING -> ACTIVATING -> HEALTH_CHECK -> COMPLETED`.
- Added guarded failure and recovery states: `FAILED -> ROLLBACK -> ROLLED_BACK`.
- Persists checkpoints and semantic history at `storage/updates/core-update.json` with a single-writer lock, monotonic revision and unique temporary-file replacement.
- Provides a persisted resume context (`resumable`, `nextAction`, `recoveryRequired`) without executing a later commit's package, migration or activation action.

## Boundary

C028 does not download, verify, stage, migrate, activate, restart, or roll back a Core release. Those effects belong to C029-C036. This commit only establishes the deterministic coordinator contract.

The record contains no source credentials, webhook secrets, package bytes, or Site content.

## Validation

```bash
node --test test/coreUpdateService.test.js
git diff --check
```

The focused tests cover valid state persistence/restart inspection, invalid and stale transition rejection, semantic bounded history, cross-instance write serialization, failure recording, and rollback lifecycle progression.

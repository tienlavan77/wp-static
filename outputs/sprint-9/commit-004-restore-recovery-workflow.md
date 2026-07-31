# Sprint 9 Commit 004 - Restore & Recovery Workflow

Status: PASS

## Delivered

- Added the versioned `wpsc.site-restore` contract.
- Added verified backup discovery through the Site Backup Service.
- Added deterministic restore planning before any Site state is mutated.
- Added Site-scoped restore execution and recovery checkpoints.
- Added a per-Site restore lock at `sites/<site>/storage/restore.lock`.
- Added restoration for Site metadata, settings, source metadata and Site Registry
  operational state.
- Added injected restorer extension points for future Scheduler, Queue, Runtime,
  Publishing and Deployment state implementations.
- Added post-restore verification against the verified backup snapshot.

## Recovery Flow

```text
Backup
  -> Integrity verification
  -> Restore plan
  -> Site restore lock
  -> WPSC operational state restore
  -> Recovery verification
  -> Lock release
```

## Ownership Boundary

The workflow restores only WPSC-owned operational data. It never restores
WordPress content, WordPress users, WooCommerce products, orders, payments,
provider databases or source credentials. Provider state remains provider-owned.

## Isolation and Safety

- Backup `siteId` must exactly match the target Site.
- Each restore lock is inside the target Site root.
- A concurrent restore for the same Site is rejected.
- Restore is planned and checksum-verified before writes begin.
- Metadata, settings and source metadata are read back after write and compared
  to the verified snapshot.
- Registry restoration preserves the existing Site UUID boundary.

## Validation

```bash
node --test test/siteRestoreService.test.js test/siteBackupService.test.js test/siteRegistry.test.js test/siteOperationsService.test.js
git diff --check
```

Focused Restore, Backup, Registry and Operations validation passed with 6 tests.

## Architecture Result

Commit 004 completes the backup recovery boundary without adding a provider-data
restore system, direct Build execution or cross-Site operational state. Health
and monitoring remain Commit 005.

# Sprint 9 Commit 003 - Site-scoped Backup Service

Status: PASS

## Delivered

- Added the versioned `wpsc.site-backup` contract.
- Added Site-scoped immutable operational snapshots under `sites/<site>/storage/backups/`.
- Added Backup ID, Site ID, timestamp, version, scope and retention metadata.
- Added SHA-256 integrity checksums over canonicalized backup state.
- Added backup listing and integrity verification.
- Added explicit Site identity validation and Site-scoped backup paths.
- Added optional snapshot readers for Runtime, Scheduler, Queue, Publishing,
  Deployment and Extensions.
- Added recursive redaction for secrets and credential-shaped fields.

## Backup Scope

```text
WPSC operational state
  -> Site metadata
  -> Site settings
  -> Source metadata (never source credentials)
  -> Site Registry operational record
  -> Runtime / Scheduler / Queue state readers
  -> Publishing / Deployment / Extension state readers
```

WordPress and WooCommerce databases are external authorities. They are not read,
copied or represented as restorable WPSC-owned data by this service.

## Security Boundary

- The source credential file is never read.
- Password, secret, token, credential, authorization, consumer and API-key
  shaped fields from injected state are redacted before persistence.
- A backup path is derived from the requested Site root, so a backup for one
  Site cannot be listed or verified through another Site path.

## Validation

```bash
node --test test/siteBackupService.test.js test/siteRegistry.test.js test/siteOperationsService.test.js test/siteRepository.test.js
git diff --check
```

Focused Backup, Registry, Operations and Repository validation passed with
8 tests.

## Architecture Result

Commit 003 introduces a WPSC operational backup boundary only. It does not
create a provider database backup, a second source of truth, a Restore workflow
or a cross-Site state store. Restore planning and execution remain Commit 004.

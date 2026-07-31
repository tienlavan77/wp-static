# Sprint 9 Commit 006 - Structured Logging & Audit Trail

Status: PASS

## Delivered

- Added the versioned `wpsc.operation-log` contract.
- Added the versioned `wpsc.audit-event` contract.
- Added persistent Site-scoped NDJSON operation logs and audit trails under
  `sites/<site>/storage/logs/`.
- Added structured fields for timestamp, level, Site ID, service, operation,
  request ID, correlation ID, job ID, event ID, result and error code.
- Added explicit operator/system actor records for audit events.
- Added Site-scoped query APIs for logs and audit events.
- Added recursive redaction for secrets, credentials, tokens, authorization,
  consumer keys/secrets and API keys.

## Log and Audit Boundary

```text
Operational service
  -> Structured operation record
  -> Site log storage

Protected operation
  -> Audit event
  -> Site audit storage
```

The observability service records facts about an operation. It does not execute
the operation, authorize it, inspect provider credentials, control Scheduler or
write public output.

## Security Rules

- Every persisted operational record requires an explicit Site ID.
- Site A log paths and Site B log paths are independent.
- Sensitive field names are redacted recursively before persistence.
- Credentials and raw provider payloads are not accepted as a logging contract.
- Correlation, request, job and event IDs link records without exposing secrets.

## Validation

```bash
node --test test/operationalObservabilityService.test.js test/siteHealthService.test.js test/siteRestoreService.test.js test/siteBackupService.test.js
git diff --check
```

Focused Observability, Health, Restore and Backup validation passed with
6 tests.

## Architecture Result

Commit 006 adds production-grade structured observability around Site operations
without changing Runtime Flow, Scheduler Policy, Queue lifecycle, Dispatcher
execution, Builder ownership or provider authority. Security baseline remains
Commit 007.

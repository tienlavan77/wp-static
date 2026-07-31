# Sprint 9 Commit 005 - Monitoring & Health Service

Status: PASS

## Delivered

- Added the versioned `wpsc.site-health` contract.
- Added canonical health states: `healthy`, `degraded`, `unhealthy`, `unknown`.
- Added Site-aware injected checks for Runtime, services, dependencies, Build and
  Deployment.
- Added deterministic check ordering and immutable health snapshots.
- Added aggregate Site health and per-category Runtime, service, dependency and
  Deployment health states.
- Added normalized diagnostics when a health check throws or a dependency fails.
- Added explicit unknown-Site rejection.

## Monitoring Boundary

```text
Health Service
  -> injected read-only checker
  -> Runtime / Source / WooCommerce / Scheduler / Queue / Dispatcher
  -> Builder / Output / Cache / Search / Webhook / Deployment
```

Health checks receive only an immutable Site identity context. They observe
state; they do not mutate Site configuration, enqueue work, retry a Job, invoke
Build, activate a deployment or become an execution engine.

## State Aggregation

```text
unhealthy  if any check is unhealthy
degraded   if no check is unhealthy and one is degraded
healthy    if all configured checks are healthy
unknown    if no checks are configured or state is unknown
```

Dependency failures remain distinguishable from WPSC service, Build and
Deployment failures through each check's category and diagnostics.

## Validation

```bash
node --test test/siteHealthService.test.js test/siteRestoreService.test.js test/siteBackupService.test.js test/siteOperationsService.test.js
git diff --check
```

Focused Health, Restore, Backup and Operations validation passed with 6 tests.

## Architecture Result

Commit 005 adds production observability without changing Runtime, Scheduler,
Queue, Dispatcher, Builder or Output ownership. Structured Logging and Audit
Trail remain Commit 006.

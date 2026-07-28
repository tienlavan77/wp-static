# Sprint 6 - Phase 6 - Commit 035 Closeout

Status: Complete

## Architecture Freeze

```text
Gateway -> Scheduler -> Queue -> Dispatcher -> Build Engine
```

Every Browser, CLI, Webhook, Schedule, API, or Plugin build request enters via
Scheduler. No gateway calls Queue, Dispatcher, or Build Engine directly.

## Audit

- Job metadata and finished history are immutable snapshots.
- Queue owns job lifecycle and one-active-job-per-site protection.
- Scheduler owns tick, trigger evaluation, retry policy, and enqueue locking.
- Dispatcher is injected with Build Engine and only records success/failure.
- Build Engine remains the sole owner of build lifecycle and diagnostics.
- `scheduler.*`, `job.*`, and `build.*` event namespaces are isolated.

## Deferred Work

Distributed Queue, multi-thread work, incremental builds, dependency graph,
cache, preview, deployment, CDN, and scheduler persistence are outside Phase 6.

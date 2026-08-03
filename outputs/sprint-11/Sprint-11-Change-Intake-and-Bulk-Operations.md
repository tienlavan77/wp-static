# Sprint 11 - Change Intake and Bulk Operations

Status: PLANNED

## Goal

Make WPSC reliable when WordPress, WooCommerce, imports or external systems
produce many changes in a short period. No valid source change may be lost
merely because another Site Build is currently running.

## Product flow

```text
WordPress / WooCommerce / Import / Sync / Schedule
    ↓
Normalized change event
    ↓
Idempotency and Site-scoped coalescing
    ↓
Pending Job or deferred change set during running Build
    ↓
Scheduler
    ↓
Queue → Dispatcher → Build Runtime
    ↓
Verified public snapshot
```

## Architecture boundaries

- Gateway/adapter normalizes source events only.
- Scheduler owns intake, defer and follow-up enqueue policy.
- Queue owns immutable Job lifecycle only.
- Dispatcher owns execution handoff only.
- Build Engine/Builder/Output Pipeline are not changed to implement intake.
- Deferred records contain normalized identities, never source credentials or
  raw provider payloads.

## Proposed commits

| Commit | Scope | Outcome |
| --- | --- | --- |
| C028 | Running-Build deferred change set | Changes during a running Build form one follow-up Job. |
| C029 | Durable deferred state and restart recovery | Deferred changes survive Runtime restart safely. |
| C030 | Bulk event normalization and idempotency | Product/Post/Page batch events retain latest entity state. |
| C031 | Taxonomy, Menu and Media bulk policy | Correct full/targeted refresh behavior for derived routes. |
| C032 | Import and scheduled publishing intake | CSV/import and schedule bursts use the same intake contract. |
| C033 | External sync extension point | ERP/POS connectors publish normalized events; no vendor connector yet. |
| C034 | Destructive bulk safety | Delete/unpublish/rename batches retain full reconciliation. |
| C035 | Runtime E2E matrix | Pending/running/retry/restart/duplicate/burst evidence. |
| C036 | Operations view and closeout | Safe operational status, audit, documentation and freeze. |

## Bulk classes

- WooCommerce Product, price, stock, variation, category, tag and attribute.
- WordPress Page/Post, status, author, category and tag.
- Taxonomy, menu and media changes.
- CSV/import-export, scheduled publish/unpublish and webhook replay.
- Restore/migration Site-wide reconciliation.
- ERP/POS synchronization through the future extension point.

## Non-goals

- No ERP/POS vendor-specific implementation in this Sprint.
- No redesign of Build Engine, Output Pipeline or Scheduler state contracts.
- No performance optimisation claim based on the C026 tiny fixture benchmark.
- No WPSC Core Update workflow; Core Update is a separate product sprint.

## Sprint Definition of Done

- Changes arriving while a Build runs are not lost.
- One Site never has two simultaneous Build executions.
- Bursts create bounded coalesced/follow-up Jobs, not one Build per webhook.
- Delete/rename safety and source credential boundaries remain intact.
- E2E covers Product, Post/Page, taxonomy, media, duplicate, running Build,
  restart and failure recovery scenarios.
- Architecture and operational contracts are documented and frozen.

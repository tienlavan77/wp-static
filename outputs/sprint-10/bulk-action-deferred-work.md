# Deferred Work - Bulk Action and Running-Build Change Intake

Status: RECORDED - NOT IMPLEMENTED

## Context

WPSC already coalesces multiple webhook changes into one pending Job per Site.
This protects normal bulk Product/Post updates while a Job is `QUEUED`.

The current one-active-Build-per-Site protection rejects a new Job when that
Site has a `RUNNING` Job. A source that does not retry a rejected webhook can
therefore leave a later bulk change without a follow-up Build.

## Planning decision

This work is not a single commit. It is owned by **Sprint 11 - Change Intake
and Bulk Operations**. The deferred-running-Build mechanism is its first
implementation commit, not its complete delivery.

```text
Build A running
    ↓
Webhook changes B, C, D arrive
    ↓
Site-scoped deferred change set
    ↓
Build A finishes
    ↓
One follow-up Job with latest B + C + D state
```

## Boundary

- Queue remains owner of pending/running/finished Job lifecycle.
- Scheduler remains owner of enqueue/defer policy.
- Dispatcher and Build Engine remain unchanged.
- Deferred state contains normalized change identities only, never provider
  credentials, raw source payloads, or Build diagnostics.
- Existing duplicate-event idempotency and pending-Job coalescing must remain
  intact.

## Covered change classes

- Bulk Product: price, stock, sale, category, tags, attributes, variations.
- Bulk Post/Page: content, status, author, categories and tags.
- Taxonomy/menu/media batch updates.
- WooCommerce/WordPress import-export.
- ERP/POS synchronization.
- Scheduled publish/unpublish batches.
- Restore/migration and webhook replay.
- Theme or Site-wide configuration changes requiring full reconciliation.

## Acceptance scenarios

- Ten distinct changes while queued become one pending Job.
- Repeated entity changes retain only its latest change metadata.
- Changes arriving while Build runs create exactly one follow-up Job.
- Build failure/retry/restart never drops deferred changes.
- Delete/rename keeps full-reconciliation safety behavior.
- Deferred bulk operations preserve Site isolation and no credential leakage.

# Sprint 10 Commit 026 - Phase 08 Product Webhook

Status: PASS

## Scope

The test starts from a real completed Runtime build, then submits a signed
WooCommerce Product webhook to the Runtime Webhook Receiver.

It independently verifies the ownership chain before source mutation testing:

1. Receiver accepts the webhook (`202`).
2. Queue owns one pending Job with the fixed `webhook` trigger type.
3. The Job retains normalized Product change metadata.
4. Scheduler tick claims and dispatches that same Job.
5. Dispatcher finishes it successfully and Queue owns the finished snapshot.

No direct Build Integration, Builder or Output Pipeline invocation is used.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 8 accepts a Product webhook and completes its Runtime Job lifecycle (1526.687206ms)
8 passed, 0 failed
```

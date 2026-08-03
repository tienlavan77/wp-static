# Sprint 10 Commit 026 - Phase 17 Failure / Recovery

Status: PASS

## Scope

After an initial verified Runtime snapshot, the WooCommerce HTTP fixture is
configured to fail exactly one authenticated source request during a changed
Product build.

The test requires:

- Build status is `FAILED`;
- prior `public/dist` Product HTML remains byte-identical;
- failed Job is retained by Queue as a finished failed snapshot;
- after the source becomes available, a new webhook completes successfully
  and publishes the changed Product.

Recovery is driven by a new source event, consistent with the existing default
Scheduler retry policy (`maxRetries: 0`). The test does not introduce an
automatic retry policy or bypass normal Runtime ownership.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 17 preserves the verified public snapshot on source failure and recovers on a new webhook (1271.611427ms)
17 passed, 0 failed
```

# Sprint 7 Commit 008 - Publishing Coordination

## Delivered

- Stable publish-event contract: `wpsc.publish-event` version 1.
- WordPress changes normalize into Site-scoped events containing event ID,
  Site ID, source, entity type, entity ID, change type and timestamp.
- Publishing Coordinator converts normalized entities to incremental-build
  change hints and hands one request to Scheduler.
- In-memory bounded idempotency prevents duplicate webhook delivery from
  creating repeated jobs within the configured window.
- Scheduler now preserves `changed` hints when creating Queue jobs and when
  retrying failed jobs.
- Runtime Webhook Receiver retains responsibility for UUID/secret validation
  and delegates publishing coordination after successful authentication.

## Ownership

```text
WordPress Webhook
  -> Runtime Webhook Gateway
  -> Publish Event Coordinator
  -> Scheduler
  -> Queue
  -> Dispatcher
  -> Builder
```

- Webhook owns request authentication and validation.
- Publishing owns event normalization and bounded idempotency.
- Scheduler owns scheduling and retry policy.
- Queue owns Job state.
- Dispatcher owns execution.
- Builder owns build semantics.

No layer calls Builder directly.

## Idempotency Boundary

The default five-minute in-memory window is sufficient to prevent immediate
duplicate delivery from producing uncontrolled jobs. Durable cross-restart
event storage and full event audit remain deferred to Production Operations.

## Validation

```bash
node --test test/publishEventCoordinator.test.js test/runtimeWebhookReceiver.test.js test/scheduler.test.js test/jobQueue.test.js test/jobDispatcher.test.js
node framework/src/cli/index.js --help
git diff --check
```

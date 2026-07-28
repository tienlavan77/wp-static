# Scheduler Architecture

## Official Build Request Flow

```text
Browser / CLI / Webhook / Schedule
                |
                v
            Scheduler
                |
                v
            Job Queue
                |
                v
          Job Dispatcher
                |
                v
           Build Engine
                |
                v
      sites/<site>/public/
```

## Ownership

| Component | Owns | Must not own |
| --- | --- | --- |
| Gateways | Fixed trigger type and request intake | Queue, Dispatcher, Build Engine calls |
| Scheduler | Tick, schedule evaluation, retry, enqueue policy | Build execution or build diagnostics analysis |
| Job Queue | Immutable pending/running/finished Job snapshots | Dispatch or Build Engine access |
| Dispatcher | Claim Job, invoke injected Build Engine, complete Job | Content, theme, output, build workflow logic |
| Build Engine | Build lifecycle, result, diagnostics, `build.*` | Scheduler policy or Job storage |

## Stable State and Events

Scheduler uses `STOPPED`, `RUNNING`, and `PAUSED`. Jobs use `QUEUED`,
`RUNNING`, `SUCCESS`, `FAILED`, and `CANCELLED`. These state machines remain
independent from Setup and Build Engine state.

Scheduler emits `scheduler.*`; Job processing emits `job.*`; Build Engine emits
`build.*`. Event namespaces are intentionally never shared.

## Extension Boundary

New API or Plugin triggers must be thin gateways and use the same Scheduler
entry point. Queue, Dispatcher, and Build Engine implementations remain injected
extension points. Distributed queues, multi-thread execution, incremental work,
deployment, CDN, preview, and cache are not part of Phase 6.

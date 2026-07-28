# Setup Service Architecture

## Official Flow

```text
Provisioning Foundation
        |
        v
Setup Service
   |          |
   v          v
Browser      CLI
  REST      Direct call
```

The Setup Service is the only owner of setup business logic: session lifecycle,
state transitions, environment/config contracts, and later source-registration
orchestration. Provisioning Foundation remains responsible for site creation,
UUIDs, secrets, config contracts, environment validation, transactions, and
rollback.

## Client Boundaries

| Client | Allowed integration | Forbidden |
| --- | --- | --- |
| Browser Wizard | Setup REST API | State table, transition rules, secret generation, config writes |
| CLI | Direct Setup Service call | REST dependency, local workflow rules, duplicated validation |
| Dashboard | REST or direct service adapter appropriate to deployment | A second business-logic implementation |

Browser reads API snapshots and diagnostics. CLI reads direct service snapshots
and diagnostics. Neither client chooses workflow states.

## Phase 4 Handoff

Phase 4 extends the service orchestration with source registration, webhook
activation, and first-build readiness. `READY_FOR_FIRST_BUILD` is the terminal
Setup outcome: the persisted site configuration is sufficient for a future
Build Engine to accept the site. It does not mean a build has started, is
running, or has completed.

Setup ends at this boundary. Build Engine owns queues, static generation,
output, and all build lifecycle events. Phase 4 consumes the contracts in
`docs/contracts/` and does not move workflow logic into Browser, CLI, or REST.

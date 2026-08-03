# Core Update C036 - Health Check and Automatic Rollback

## Status

PASS.

## Ownership

C036 runs only after C035 activation. It owns health verification and automatic rollback through the verified C032 recovery point. C035 contains no health or rollback logic.

## Health Contracts

Every activation verifies five explicit contracts: Runtime startup, Scheduler, Queue, Dispatcher and Build Integration. Results are persisted at `storage/updates/health.json`.

## State Flow

```text
HEALTH_CHECK
  -> all healthy: COMPLETED
  -> any failure: ROLLBACK
       -> recovery success: ROLLED_BACK
       -> recovery failure: RECOVERY_REQUIRED
```

## Executable Evidence

| Gate | Evidence |
| --- | --- |
| Healthy release remains active | All five checks pass, state becomes `COMPLETED`, and `core/active` remains `releases/1.1.0`. |
| Health failure invokes C032 | Scheduler failure calls the real `CoreUpdateRecoveryService.restore()`. |
| Core state restored | Recovery changes `core/active` from `releases/1.1.0` back to `releases/1.0.0`. |
| Explicit health matrix | Result contains Runtime, Scheduler, Queue, Dispatcher and Build Integration outcomes. |
| Rollback failure | Recovery exception persists `RECOVERY_REQUIRED` and returns `core_update.health.rollback.failed`. |
| Restart during rollback | A new service instance reads persisted `ROLLBACK`, resumes C032 recovery and reaches `ROLLED_BACK`. |
| Repeat-safe rollback | Repeating verify for the same recovery after `ROLLED_BACK` does not invoke restore again. |

The integration test exposed and fixed C032 symlink recovery: recovery now copies `core/active` with `verbatimSymlinks`, verifies its link target, and recreates the same relative symlink during restore.

## Validation

```text
Focused C036 + C032 integration: 8 passed, 0 failed
Full Core Update regression: 45 passed, 0 failed
git diff --check: PASS
```

## Boundary

C036 does not discover, download, verify, stage, migrate or activate packages. It consumes the C032 recovery point only after post-activation health fails.

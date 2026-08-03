# Core Update C034 - Migration and Configuration Validation

## Status

In progress.

## Implemented Foundation

- Added `CoreUpdateMigrationService` under Product Update ownership.
- Requires a valid staged release before any migration work begins.
- Reuses the existing `ProductMigrationService` and `ProductConfigurationValidationService`.

## Boundary

C034 does not introduce a second migration system and does not activate `core/active`. If staging, migration or configuration validation fails, the active Core must remain unchanged. Atomic activation is C035 ownership.

## Acceptance Evidence

| Gate | Evidence |
| --- | --- |
| Migration success + checkpoint | `C034 migrates and validates a staged release successfully` asserts `001: completed`. |
| Migration failure | `C034 preserves active Core on migration failure and exposes checkpoint` asserts `core_update.migration.failed`. |
| Checkpoint resume | `C034 resumes a failed migration checkpoint on a later validation attempt` fails at `001`, retries, then asserts `001: skipped` and `002: completed`. |
| Configuration failure | `C034 preserves active Core on configuration validation failure` asserts `core_update.configuration.invalid`. |
| Active pointer safety | Both failure tests assert the pointer remains `releases/1.0.0`. |

Focused C034 tests: 4 passed, 0 failed.

Full Core Update regression: 37 passed, 0 failed.

`git diff --check`: PASS.

## Status

PASS CANDIDATE, NOT CLOSED. All C034 acceptance gates have executable evidence; auditor approval is required before C034 commit and C035.

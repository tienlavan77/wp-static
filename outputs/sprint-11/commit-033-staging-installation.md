# Core Update C033 - Isolated Staging Installation

## Status

PASS.

## Delivered

- Stages a release in `core/releases/<version>` without overwriting `core/active`.
- Existing release versions are immutable and rejected.
- Staged metadata is written only in the staged release directory.
- Failed copy or marker persistence removes the incomplete staging directory.
- Restart inspection accepts only a matching `.wpsc-staged.json` marker.

## Boundary

No activation, migration, configuration mutation, Runtime restart or health check occurs in C033.

## Evidence

- Isolated staging writes `core/releases/1.1.0` and keeps `core/active` at `releases/1.0.0`.
- Existing release version is rejected as immutable.
- Missing/copy-failed package leaves no `core/releases/<version>` directory and does not change active Core.
- An incomplete release is rejected after a new service instance; adding a valid marker makes inspection pass.

## Validation

Focused C033 tests: 4 passed, 0 failed.

Core Update regression: 31 tests passed, 0 failed.

`git diff --check`: PASS.

# Core Update C035 - Atomic Activation

## Status

PASS.

Activation creates a temporary symbolic link `core/active.<pid>.tmp -> releases/<version>` and atomically renames it to `core/active`. It requires an existing staged release with a matching `.wpsc-staged.json` marker. Health and rollback remain C036.

## Current Boundary

- `core/active` is a real symlink, not a text-pointer file.
- A missing or invalid staging marker is rejected before pointer mutation.
- Previous release and staged release directories are not deleted by activation.

## Remaining Evidence Before PASS

## Executable Evidence

- Successful activation creates `active.<pid>.tmp -> releases/1.1.0`, renames it to `active`, then asserts `readlink(active) === releases/1.1.0`.
- The same success test asserts both `releases/1.0.0` and `releases/1.1.0` remain present.
- Missing release and release without a valid staging marker are rejected while `active` remains `releases/1.0.0`.
- The failure test writes the temporary symlink, injects a failure before rename, then asserts `active` remains `releases/1.0.0` and both release directories remain intact.

Focused C035 tests: 4 passed, 0 failed.

`git diff --check`: PASS.

Full Core Update regression: 41 passed, 0 failed.

Restart evidence: a fresh service instance leaves `active.interrupted.tmp` ignored and keeps `core/active -> releases/1.0.0` authoritative.

`git diff --check`: PASS.

## Audit Verdict

All C035 gates have executable evidence. C035 contains no health check and no rollback; C036 owns both.

# Sprint 1 / Commit 004 - Config Validation Command

## Goal

Add `wpsc validate` so developers can catch project configuration issues before
running a build.

## Files Changed

```text
src/cli/index.js
src/validation/validateProjectConfig.js
test/validateProjectConfig.test.js
outputs/sprint-1/commit-004-config-validate.diff.md
outputs/sprint-1/reviews/commit-004-review.md
```

## Summary

This commit adds:

- `wpsc validate [--project <dir>] [--json]`
- config file readability check
- config syntax/load check
- adapter type and URL/source checks
- theme layout/components/assets checks
- runtime configuration warning
- homepage route config check
- output directory writability check
- build output configuration check
- JSON-compatible validation output through the shared formatter

## Architecture Impact

No Sprint 0 boundary changes.

Validation logic stays inside `src/validation/`. CLI only calls the shared
validator and formatter.

## Verification

Run:

```text
node --test test/validateProjectConfig.test.js test/validationFormat.test.js test/validationEnvironment.test.js test/doctorProject.test.js
node src/cli/index.js validate --project examples/basic-shop
node src/cli/index.js validate --project examples/basic-shop --json
```

## Follow-Up Items

- Add stable validation error codes.
- Add Install Wizard skeleton.
- Reuse config validation in install report generation.


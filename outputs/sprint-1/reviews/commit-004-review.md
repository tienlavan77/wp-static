# Sprint 1 - Commit Review

## Commit

004 - Add `wpsc validate`

## Status

✅ Approved

## Files Reviewed

- `src/cli/index.js`
- `src/validation/validateProjectConfig.js`
- `test/validateProjectConfig.test.js`
- `outputs/sprint-1/commit-004-config-validate.diff.md`
- `outputs/sprint-1/reviews/commit-004-review.md`

## Review

### Product Experience

`wpsc validate` gives developers a pre-build check for common setup problems.
This aligns with Sprint 1's goal of preventing confusing build failures.

### Developer Experience

The command supports human-readable output and `--json`, matching the improved
Doctor diagnostics style.

### Architecture

The CLI does not duplicate validation rules. Validation remains in the shared
Validation Engine under `src/validation/`.

### Maintainability

The validator is testable without running a full build or fetching real
WordPress/WooCommerce data.

### Suggestions

- Keep network REST/Woo verification in Install Wizard or future Doctor checks.
- Add stable diagnostic codes before documenting error code references.

## Follow-Up Items

- Commit 005: install wizard skeleton and config generation.
- Later: error code registry and validation docs.

## Decision

Approved. Commit 004 is suitable for Sprint 1 Product Foundation.

# Sprint 1 / Commit 003 - Doctor Diagnostics

## Goal

Upgrade `wpsc doctor` output so diagnostics are easier for humans and reusable
by automation.

## Files Changed

```text
src/cli/index.js
src/validation/formatValidationResults.js
test/validationFormat.test.js
outputs/sprint-1/recommendations/commit-002-review-recommendations.md
outputs/sprint-1/commit-003-doctor-diagnostics.diff.md
outputs/sprint-1/reviews/commit-003-review.md
```

## Summary

This commit adds:

- grouped doctor output by validation category,
- `OK`, `WARNING`, and `ERROR` labels,
- fix guidance rendering,
- summary counts,
- `wpsc doctor --json`,
- shared validation formatter tests,
- captured Commit 002 review recommendations for later Sprint 1 work.

## Architecture Impact

No Sprint 0 boundary changes.

Doctor formatting uses the shared Validation Engine and does not duplicate
validation rules inside CLI code.

## Verification

Run:

```text
node --test test/validationFormat.test.js test/validationEnvironment.test.js test/doctorProject.test.js
```

## Follow-Up Items

- Add stable validation error codes.
- Add `wpsc validate`.
- Add validation documentation after codes are introduced.


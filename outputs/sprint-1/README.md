# WPSC Sprint 1 - Product Foundation

Status: `Ready for Development`

Source specification:

```text
docs/sprint-1-product-foundation.md
```

## Commit Plan

Sprint 1 will be implemented in product-focused commits. Each commit should
include a diff summary and review file, following the Sprint 0 tracking style.

```text
001 - Capture Sprint 1 product foundation spec
002 - Add validation result model and environment checks
003 - Upgrade wpsc doctor diagnostics
004 - Add wpsc validate command
005 - Add install wizard skeleton and config generation
006 - Add installation report generation
007 - Add create-wpsc scaffold templates
008 - Add installation documentation and final Sprint 1 review
```

## Constraints

Sprint 1 must not change:

```text
Architecture Boundary
Public Contracts
Runtime Boundary
Normalize Layer
Compiler Pipeline
Subsystem list
```

If any of those are required, create a new ADR before implementation.

## Tracking Rules

For each commit, create:

```text
outputs/sprint-1/commit-XXX-*.diff.md
outputs/sprint-1/reviews/commit-XXX-review.md
```

Each diff summary should include:

- Goal
- Files changed
- Summary
- Architecture impact
- Verification
- Follow-up items


# Project Layout Normalization - Commit 004 Report

Date: 2026-07-29

## Result

Static Builder implementation now lives below `framework/src/builder/`:

```text
builder/
  assets/ blocks/ cache/ content/ data/ fragments/ graph/ incremental/
  planner/ renderer/ router/ search/ seo/ taxonomy/ templates/ theme/
  visual-builder/
```

`output/` remains a peer domain because Output Pipeline owns filesystem writes.
`runtime/build/` remains Runtime-owned because it adapts the Builder into Site
Runtime rather than implementing Builder semantics.

All internal imports and public root exports were rewritten for the move.

## Validation

```bash
node --test
git diff --check
```

## Commit Proposal

```text
refactor(builder): normalize static build module ownership
```

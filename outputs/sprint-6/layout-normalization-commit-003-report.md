# Project Layout Normalization - Commit 003 Report

Date: 2026-07-29

Status: Implemented, pending Git stage and commit

## Goal

Normalize Runtime internal folders without changing Runtime flow, HTTP
contracts, business logic, public exports, or dependency direction.

## Result

Runtime-specific modules now live under explicit ownership folders:

```text
runtime/
  bootstrap/
  router/
  installer/
  dashboard/
  source/
  webhook/
  account/
  commerce/
  api/
  browser/
  extensions/
  build/
```

The root `framework/src/index.js` continues to export the same public symbols.
Only internal source locations and corresponding imports changed.

## Boundary Decisions

The following were deliberately not moved into Runtime:

- Source adapter registry and adapter contract: shared Framework/Setup boundary.
- Setup and Build APIs: their respective domain contracts.
- Scheduler webhook gateway and generic webhook pipeline: Scheduler boundary.
- Static route planning, static commerce transforms and Builder modules: Builder
  boundary.

This preserves the dependency graph instead of using similarly named folders
as a reason to change ownership.

## Validation

```bash
node --test
node framework/src/cli/index.js --help
git diff --check
```

## Commit Proposal

```text
refactor(runtime): normalize internal module ownership
```

# Project Layout Normalization - Commit 009 Report

Date: 2026-07-29

## Result

Testing ownership is normalized through an executable-path-stable taxonomy:

```text
test/            Unit, integration, Runtime, Builder and E2E test suite
test/fixtures/   Shared fixtures by external/system boundary
```

The taxonomy maps test names to Architecture owners without changing test
logic, coverage, Runtime validation, Builder validation or E2E behavior.

## Boundary Decision

Physical test moves are deferred. A mass move would rewrite relative imports,
fixture access and release checks, which conflicts with the C9 requirement to
preserve exact test semantics. The documented taxonomy provides the required
ownership structure for Commit 010 layout freeze.

## Commit Proposal

```text
docs(test): define architecture ownership taxonomy
```

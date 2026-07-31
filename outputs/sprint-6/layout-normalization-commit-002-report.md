# Project Layout Normalization - Commit 002 Report

Date: 2026-07-29

Status: Implemented, pending Git stage and commit

Related plan: `outputs/sprint-6/Project-Layout-Normalization.md`

## Goal

Make folder ownership inside `framework/src/` explicit without changing WPSC
Runtime flow, namespace contracts, business logic, or dependency direction.

## Ownership Baseline

The primary domain chain is now documented at the Framework source boundary:

```text
Site -> Provision -> Setup -> Runtime
                     -> Scheduler -> Build -> Builder -> Output
Shared
```

`framework/src/README.md` defines the responsibility of every primary domain
and classifies the remaining supporting domains. This prevents a later move
from silently assigning a module to the wrong owner.

## Changes

- Added the Framework source ownership map at `framework/src/README.md`.
- Updated the current project layout record to use the canonical
  `framework/src/` path introduced in Commit 001.
- Updated the Site Runtime configuration template so newly generated
  `runtime.config.js` files import Source infrastructure from
  `./framework/src/...`, rather than the retired `./src/...` workspace path.
- Added a regression assertion for that generated Runtime configuration path.

## Deferred Deliberately

The following remain dedicated follow-up ownership changes rather than scope
creep in Commit 002:

- Runtime submodule moves: Commit 003.
- Builder subsystem moves: Commit 004.
- Scheduler queue/dispatcher/job moves: Commit 005.
- Themes, bridges and integrations: Commit 007.
- CLI and tooling: Commit 008.
- Test taxonomy: Commit 009.

## Contract and Runtime Safety

No public export name, Runtime endpoint, event, scheduler policy, build
lifecycle, source adapter contract, or output behavior changes in this commit.
The only executable path update applies to newly generated Runtime config files
and matches the completed workspace move in Commit 001.

## Verification

```bash
node --test
node framework/src/cli/index.js --help
git diff --check
```

## Commit Proposal

```text
docs(layout): define framework source ownership
```

# Project Layout Normalization - Commit 001 Report

Date: 2026-07-29

Status: Implemented, pending Git stage and commit

Related plan: `outputs/sprint-6/Project-Layout-Normalization.md`

## Objective

Normalize the top-level Framework workspace without changing WPSC business
logic, Runtime workflow, Site lifecycle, or public product behavior.

The old layout placed the actual Framework implementation directly under the
repository root:

```text
src/
```

The Architecture v2 workspace boundary expects Framework-owned source to be
contained by `framework/`. Commit 001 establishes that boundary:

```text
framework/
  src/
```

## Changes

- Moved the complete Framework implementation from `src/` to `framework/src/`.
- Removed the obsolete placeholder role of `framework/.gitkeep`; `framework/`
  now contains real Framework source.
- Updated executable entry points:
  - root npm scripts;
  - root package exports and `wpsc` binary entry;
  - `runtime.config.js` source-adapter imports;
  - scripts and the Basic Shop Runtime example.
- Updated package re-export shims in `packages/*/src/` so package consumers
  continue to reach the Framework implementation.
- Updated all test imports to use `framework/src/`.
- Updated current user-facing documentation and WordPress integration commands
  from `node src/cli/index.js` to `node framework/src/cli/index.js`.

## Explicit Non-Changes

This commit does not:

- alter module ownership inside `framework/src/` (Commit 002 owns that work);
- move or redesign Runtime internals (Commit 003);
- change Builder, Scheduler, Setup, Source, Theme, or Output behavior;
- change Site configuration, credentials, generated artifacts, or Runtime
  state;
- rewrite historical diff/audit records under `outputs/`.

## Compatibility Boundary

Commands and imports that previously used the root source path must now use:

```bash
node framework/src/cli/index.js --help
node framework/src/cli/index.js runtime:serve --config runtime.config.js
```

The npm scripts remain the recommended stable interface:

```bash
npm run build
npm run wpsc -- --help
```

## Verification

The following checks passed after the move and reference updates:

```bash
node --test
node framework/src/cli/index.js --help
git diff --check
```

The complete test suite passed. The change is path-only: no test contract or
business result was intentionally changed.

## Runtime State Excluded From Commit

The following live/generated Site changes are intentionally left unstaged:

```text
sites/tinsinhphat/config/site.json
sites/tinsinhphat/public/dist/.gitkeep
```

They belong to the active Runtime Site and are not part of workspace layout
normalization.

## Commit Proposal

```text
refactor(layout): normalize framework workspace root
```

## Next Commit

Commit 002 will normalize responsibility boundaries inside `framework/src/`:

```text
Site -> Provision -> Setup -> Runtime -> Scheduler -> Build -> Builder -> Output -> Shared
```

It must preserve the workspace boundary established by this commit.

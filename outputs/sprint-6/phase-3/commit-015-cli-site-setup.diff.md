# Sprint 6 - Phase 3 Commit 015 Diff Summary

## Commit

cli: implement site:setup

## Scope

Add the `wpsc site:setup` command as a direct Setup Service client. It prints
the service-owned presentation/progress contract and diagnostics without using
the Browser REST API.

## Files Added

- `src/cli/createSiteSetupCommand.js`
- `test/siteSetupCommand.test.js`
- `outputs/sprint-6/phase-3/commit-015-cli-site-setup.diff.md`

## Files Changed

- `src/cli/index.js`
- `src/index.js`

## What Changed

- Added `wpsc site:setup --site <site-id> [--advance]`.
- CLI adapter injects `SetupClient.CLI` and calls Setup Service directly.
- CLI prints the existing title, progress, and revision presentation contract.
- CLI renders Setup Service diagnostics unchanged, including code, message, and
  severity.
- `--advance` invokes the service-owned advance action; the CLI never supplies
  a target state.

## Architecture Audit

- CLI imports neither `createSetupApi` nor `fetch` and does not call REST.
- CLI stores no setup workflow, progress, config, or Browser-local state.
- Browser REST API remains Browser-only; the common business layer is Setup
  Service.
- No presentation fields, session persistence, source registration, or first
  build behavior were added.

## Verification

```bash
node --check src/cli/createSiteSetupCommand.js
node --check src/cli/index.js
node --test test/siteSetupCommand.test.js test/setupWizard.test.js test/setupApi.test.js test/setupService.test.js test/setupSessionManager.test.js test/setupStateMachine.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
node src/cli/index.js site:setup --site company-a --advance
git diff --check
```

## Test Result

```text
tests 20
pass 20
fail 0
```

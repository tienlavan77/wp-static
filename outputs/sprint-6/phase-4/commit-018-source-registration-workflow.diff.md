# Sprint 6 - Phase 4 Commit 018 Diff Summary

## Commit

source: implement registration workflow

## Scope

Implement the Setup-owned source registration workflow: initialize the loaded
adapter, validate input, health-check connectivity, retrieve safe metadata, and
persist `config/source.json`. This commit does not register or remove webhooks.

## Files Added

- `src/setup/createSourceRegistrationService.js`
- `test/sourceRegistrationService.test.js`
- `outputs/sprint-6/phase-4/commit-018-source-registration-workflow.diff.md`

## Files Changed

- `src/site/createSiteRepository.js`
- `src/index.js`

## What Changed

- Added Setup-owned `createSourceRegistrationService()`.
- Loads adapters through the contract loader, then executes `initialize`,
  read-only `validate`, and connectivity-only `healthCheck`.
- Persists sanitized metadata through Site Repository at
  `sites/<site>/config/source.json` only after validation and health pass.
- Persists source type, endpoint, adapter version, capabilities, schema, and
  registration timestamp; drops adapter runtime/sensitive metadata.
- Emits `source.validated`, `source.connected`, and `source.failed` events.
- Normalizes adapter and persistence exceptions to structured diagnostics.

## Architecture Audit

- Source Adapter never receives Site Repository and cannot persist config.
- `validate()` and `healthCheck()` are consumed as read-only checks.
- `registerWebhook()` is present only as an unused contract method; this commit
  never calls it.
- Adapter `getMetadata()` is reduced to `sourceType`, `adapterVersion`, and
  `capabilities` before persistence.
- Browser, CLI, REST, and Setup Service integration remain later commits.

## Verification

```bash
node --check src/setup/createSourceRegistrationService.js
node --check src/site/createSiteRepository.js
node --test test/sourceAdapterContract.test.js test/sourceRegistrationService.test.js test/siteRepository.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 13
pass 13
fail 0
```

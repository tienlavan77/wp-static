# Sprint 6 - Phase 2 Commit 007 Diff Summary

## Commit

refactor(provision): harden configuration and environment contracts

## Scope

Harden the contracts introduced by Commit 006 without adding provisioning
features, secret persistence, source registration, or setup UI behavior.

## Files Changed

- `src/index.js`
- `src/provision/createProvisioningConfig.js`
- `src/provision/validateProvisioningEnvironment.js`
- `test/provisioningConfig.test.js`
- `test/provisioningEnvironment.test.js`
- `outputs/sprint-6/phase-2/commit-007-provisioning-contract-hardening.diff.md`

## What Changed

- Replaced the generic configuration `version` field with the explicit
  `schemaVersion: 1` contract.
- Added a separate optional `frameworkVersion`, keeping framework and config
  schema evolution independent.
- Validated `schema`, `schemaVersion`, and `frameworkVersion` when a config is
  consumed or reconstructed.
- Deep-froze every returned provisioning config, including nested source,
  environment, and secret objects.
- Added normalized environment-report severity values: `info`, `warning`, and
  `error`. Existing `status` remains for compatibility with shared validation
  primitives.

## Architecture Notes

`validateProvisioningEnvironment()` is the shared environment-report boundary
for Provisioning, the future Setup Service, Browser Wizard, and CLI. Consumers
can render `code`, `message`, and `severity` without translating provider
specific check results.

Configuration follows the immutable workflow:

```text
create -> validate -> freeze -> consume
```

Any future update must clone, modify, validate, freeze, and replace the config;
it must never mutate the active config in place.

## Verification

```bash
node --check src/provision/createProvisioningConfig.js
node --check src/provision/validateProvisioningEnvironment.js
node --check src/index.js
node --test test/provisioningConfig.test.js test/provisioningEnvironment.test.js test/provisioningService.test.js test/provisioningSecrets.test.js
git diff --check
```

## Test Result

```text
tests 16
pass 16
fail 0
```

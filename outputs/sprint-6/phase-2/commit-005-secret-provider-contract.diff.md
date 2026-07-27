# Sprint 6 - Phase 2 Commit 005 Diff Summary

## Commit

refactor(provision): add secret provider contract

## Scope

Refactor provisioning secrets toward provider-based, metadata-rich secret management.

## Files Changed

- `src/provision/createProvisioningSecrets.js`
- `src/index.js`
- `test/provisioningSecrets.test.js`
- `outputs/sprint-6/phase-2/commit-005-secret-provider-contract.diff.md`

## What Changed

- Renamed secret naming contract to `ProvisioningSecretType`.
- Added `createRandomSecretProvider()`.
- Added metadata for every secret:
  - `type`
  - `version`
  - `createdAt`
  - `algorithm`
- Added `unwrapProvisioningSecrets()` helper.
- Kept CSPRNG generation with `crypto.randomBytes`.
- Added tests that confirm `Math.random` is not used.

## Architecture Notes

This prepares future secret rotation and external providers such as Vault, AWS Secrets Manager, or Azure Key Vault without coupling Provisioning Engine to one secret backend.

No secrets are logged or emitted by this module.

## Verification

```bash
node --check src/provision/createProvisioningSecrets.js
node --test test/provisioningSecrets.test.js
```

## Audit Result

Ready for review.

## Test Result

```text
tests 10
pass 10
fail 0
```

## Diff Stat

```text
 src/index.js                               |  6 ++-
 src/provision/createProvisioningSecrets.js | 83 ++++++++++++++++++++++++------
 test/provisioningSecrets.test.js           | 52 ++++++++++++++++---
 3 files changed, 119 insertions(+), 22 deletions(-)
```

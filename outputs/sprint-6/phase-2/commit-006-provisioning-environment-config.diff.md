# Sprint 6 - Phase 2 Commit 006 Diff Summary

## Commit

feat(provision): validate environment and create configuration contract

## Scope

Add the preflight environment gate for shared provisioning and a versioned,
site-local provisioning configuration contract.

## Files Added

- `src/provision/createProvisioningConfig.js`
- `src/provision/validateProvisioningEnvironment.js`
- `test/provisioningConfig.test.js`
- `test/provisioningEnvironment.test.js`
- `outputs/sprint-6/phase-2/commit-006-provisioning-environment-config.diff.md`

## Files Changed

- `src/provision/createProvisioningService.js`
- `src/index.js`
- `test/provisioningService.test.js`

## What Changed

- Added `validateProvisioningEnvironment()` using the shared validation
  primitives for Node.js compatibility and a writable workspace `sites/`
  directory.
- Provisioning validates its environment before it creates any site directory
  or writes metadata.
- Added the `provision.environment.validated` lifecycle event and an explicit
  `validate_environment` transaction step.
- Added a versioned `createProvisioningConfig()` contract with isolated copies
  of site, environment, source, and secret data.
- Added validation diagnostics for missing site identity and invalid required
  config sections; missing values are not silently converted to empty objects.

## Architecture Notes

The environment check is shared infrastructure: it reuses
`src/validation/checkEnvironment.js` rather than creating a provisioning-only
copy. A failed preflight returns before any site runtime data is written.

The configuration contract remains site-local and has no public-output path.
Secret records retain the metadata-rich provider contract from Commit 005, but
secret persistence, source registration, and first build remain out of scope.

## Verification

```bash
node --check src/provision/createProvisioningConfig.js
node --check src/provision/validateProvisioningEnvironment.js
node --check src/provision/createProvisioningService.js
node --test test/provisioningConfig.test.js test/provisioningEnvironment.test.js test/provisioningService.test.js test/provisioningSecrets.test.js
git diff --check
```

## Test Result

```text
tests 15
pass 15
fail 0
```

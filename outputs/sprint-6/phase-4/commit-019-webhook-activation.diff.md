# Sprint 6 - Phase 4 Commit 019 Diff Summary

## Commit

webhook: implement webhook activation

## Scope

Implement Setup-owned webhook activation: adapter registration, verification,
removal, and narrow webhook metadata updates. This commit does not run source
validation, health checks, or source-registration metadata discovery.

## Files Added

- `src/setup/createWebhookActivationService.js`
- `test/webhookActivationService.test.js`
- `outputs/sprint-6/phase-4/commit-019-webhook-activation.diff.md`

## Files Changed

- `src/source/sourceAdapterContract.js`
- `src/index.js`
- `test/sourceRegistrationService.test.js`
- `outputs/sprint-6/phase-4/commit-017-source-adapter-contract.diff.md`

## What Changed

- Added required `verifyWebhook()` to the Source Adapter contract.
- Added webhook activation service with `activate()` and `remove()` operations.
- Activation calls `registerWebhook()` then `verifyWebhook()` before any write.
- Persists `webhookId`, `webhookStatus`, and `webhookRegisteredAt` only after
  verification succeeds.
- Removal calls `unregisterWebhook()` and persists `webhookStatus: removed`.
- Emits `webhook.registered`, `webhook.failed`, and `webhook.removed`.

## Architecture Audit

- Webhook workflow lives in the Setup-owned activation service, not Browser,
  CLI, REST, or a source-specific adapter implementation.
- Adapter returns webhook results; it never receives Site Repository access.
- C19 never calls `initialize`, `validate`, `healthCheck`, or `getMetadata`.
- Verification failure leaves the existing `config/source.json` webhook fields
  untouched.
- Source metadata hardening (`metadataVersion`, canonical endpoint, and fixed
  capability enum) remains deliberately deferred to avoid expanding C19 scope.

## Verification

```bash
node --check src/setup/createWebhookActivationService.js
node --check src/source/sourceAdapterContract.js
node --test test/sourceAdapterContract.test.js test/sourceRegistrationService.test.js test/webhookActivationService.test.js test/siteRepository.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 16
pass 16
fail 0
```

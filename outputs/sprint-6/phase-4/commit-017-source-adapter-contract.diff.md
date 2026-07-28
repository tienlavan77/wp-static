# Sprint 6 - Phase 4 Commit 017 Diff Summary

## Commit

source: introduce Source Adapter contract

## Scope

Introduce the adapter-agnostic Source Adapter contract, registry, and loader.
This commit contains no WordPress/Shopify/Ghost implementation, no credential
validation, no source metadata persistence, and no webhook activation.

## Files Added

- `src/source/sourceAdapterContract.js`
- `src/source/createSourceRegistry.js`
- `src/source/createSourceAdapterLoader.js`
- `test/sourceAdapterContract.test.js`
- `outputs/sprint-6/phase-4/commit-017-source-adapter-contract.diff.md`

## Files Changed

- `src/index.js`

## Contract

Every Source Adapter must implement:

```text
initialize()
validate()
healthCheck()
registerWebhook()
unregisterWebhook()
verifyWebhook()
getMetadata()
```

Adapter factories are registered under a normalized source type and loaded only
after contract validation. Loading an adapter does not call any adapter
lifecycle method.

## Architecture Audit

- Setup Service can target the shared adapter interface without knowing a
  platform-specific implementation.
- Registry/Loader contain no source credential, webhook, or persistence logic.
- Browser, CLI, and REST receive no source-specific logic.
- Future Source Adapters extend the registry; they do not require a Setup
  Service modification.

## Verification

```bash
node --check src/source/sourceAdapterContract.js
node --check src/source/createSourceRegistry.js
node --check src/source/createSourceAdapterLoader.js
node --test test/sourceAdapterContract.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
git diff --check
```

## Test Result

```text
tests 7
pass 7
fail 0
```

# Sprint 10 Commit 001 - Product Manifest & Versioning

Status: PASS

## Delivered

- Added the versioned `wpsc.product` Product Manifest contract.
- Added stable WPSC product identity: `productId: wpsc`.
- Added product, Architecture and Runtime versions.
- Added product schema and compatibility schema versions.
- Added deterministic, immutable Product Manifest generation.
- Added compatibility validation for Architecture, Runtime, Node and declared
  schema versions.

## Product Identity

```text
WPSC Product Manifest
  -> productId
  -> version
  -> architectureVersion
  -> runtimeVersion
  -> schemaVersion
  -> compatibility
```

The manifest contains only identity and compatibility metadata. It contains no
license, billing, entitlement, installation secrets or Site-specific state.

## Compatibility Rules

- Runtime Architecture version must match the Product Manifest.
- Runtime version must match the Product Manifest.
- Node version must meet the declared minimum.
- Declared schema versions must match when Runtime supplies those schemas.
- Invalid manifests are rejected before use.

## Validation

```bash
node --test test/productManifest.test.js test/sprint9ArchitectureAudit.test.js test/sprint9ProductionOperationsE2E.test.js
git diff --check
```

Product Manifest and Sprint 9 regression validation passed with 5 tests.

## Architecture Result

Commit 001 adds Product identity above the frozen Core. It does not add License,
Billing, Commercial Entitlement, bootstrap behavior or a second Runtime. The
Installation / Bootstrap Package remains Commit 002.

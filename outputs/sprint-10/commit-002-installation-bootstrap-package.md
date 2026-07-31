# Sprint 10 Commit 002 - Installation / Bootstrap Package

Status: PASS

## Delivered

- Added the versioned `wpsc.installation-bootstrap` contract.
- Added installation-level directory initialization:
  `config`, `storage`, `storage/logs`, `storage/tmp`,
  `storage/support-bundles` and `sites`.
- Added initial Product configuration at `config/wpsc.json`.
- Added installation metadata at `config/installation.json`.
- Added initialization of the existing Site Registry contract.
- Added injected Runtime readiness validation.
- Added idempotent bootstrap behavior: existing configuration, installation
  metadata and registry are never overwritten.
- Added immutable bootstrap responses and normalized diagnostics.

## Bootstrap Flow

```text
Install WPSC
    -> Create required directories
    -> Initialize Product configuration
    -> Initialize Site Registry
    -> Validate Runtime readiness
    -> Ready
```

Running Bootstrap again reads the existing installation and preserves its Product
version, configuration and Site records.

## Boundary

- Bootstrap initializes WPSC-owned installation state only.
- It does not create a Site, connect a provider, build content or deploy output.
- It does not overwrite existing configuration.
- It does not create license, billing or commercial entitlement state.
- The Site Registry remains the existing Sprint 9 Registry; no parallel registry
  was introduced.

## Validation

```bash
node --test test/installationBootstrapService.test.js test/productManifest.test.js test/sprint9ProductionOperationsE2E.test.js
git diff --check
```

Installation Bootstrap, Product Manifest and Sprint 9 regression validation
passed with 5 tests.

## Architecture Result

Commit 002 creates the first-run product installation boundary on top of the
frozen Runtime and Site Registry. Environment Configuration remains Commit 003.

# Sprint 10 Commit 006 - Configuration Validation

Status: PASS

## Delivered

- Added the versioned `wpsc.product-configuration-validation` contract.
- Added read-only Product configuration validation.
- Added Product Manifest and Architecture/Runtime/Node compatibility validation.
- Added required installation path validation.
- Added Site Registry validation.
- Added registered Site metadata and settings inspection.
- Added Environment Configuration and Secret Reference validation.
- Added normalized `valid`, `invalid`, errors and warnings output.

## Validation Flow

```text
Product configuration
    -> Product compatibility
    -> Installation paths
    -> Site Registry
    -> Site metadata / settings
    -> Environment secret references
    -> valid | invalid
```

## Boundaries

- Validation reads only; it does not mutate configuration, Registry or Sites.
- Secret References are validated structurally; secret values are never read.
- Provider credentials and provider data are not inspected.
- Missing Site settings are a warning; unreadable metadata/Registry/configuration
  are errors.
- The service is reusable by the official `wpsc doctor` command in a later CLI
  wiring step without duplicating validation logic.

## Validation

```bash
node --test test/productConfigurationValidationService.test.js test/environmentConfigurationService.test.js test/installationBootstrapService.test.js test/productMigrationService.test.js
git diff --check
```

Configuration Validation, Environment, Bootstrap and Migration validation
passed with 8 tests.

## Architecture Result

Commit 006 separates configuration from validation and preserves the Secrets
Boundary. It adds no provider connectivity, Build execution or Scheduler logic.
Packaging & Distribution Artifact remains Commit 007.

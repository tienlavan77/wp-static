# Sprint 10 Commit 003 - Environment Configuration

Status: PASS

## Delivered

- Added the versioned `wpsc.environment-configuration` contract.
- Added `development` and `production` environment profiles.
- Added safe Runtime defaults for host, port and log level.
- Added controlled environment variable mapping.
- Added environment-backed Secret References.
- Added direct-secret detection and ignore warnings.
- Added configuration validation and immutable configuration snapshots.

## Configuration Flow

```text
Environment variables
    -> Environment Configuration
    -> Runtime / Product Services
```

Only supported non-secret variables and `*_REF` secret references are mapped to
configuration. Direct secret values are neither copied nor serialized.

## Profile Defaults

```text
development  -> 127.0.0.1:8787, debug logging
production   -> 0.0.0.0:8787, info logging
```

## Secret Boundary

```text
WPSC_AUTH_BRIDGE_SECRET=actual-value
WPSC_AUTH_BRIDGE_SECRET_REF=WPSC_AUTH_BRIDGE_SECRET
```

The configuration stores only:

```json
{
  "store": "environment",
  "name": "WPSC_AUTH_BRIDGE_SECRET"
}
```

It never contains `actual-value`. Direct sensitive environment values are
ignored and produce an operator warning.

## Validation

```bash
node --test test/environmentConfigurationService.test.js test/installationBootstrapService.test.js test/secretsBoundaryService.test.js test/productManifest.test.js
git diff --check
```

Environment Configuration, Bootstrap, Secrets and Product validation passed
with 8 tests.

## Architecture Result

Commit 003 centralizes Product environment configuration without exposing
secrets, modifying Runtime Flow or introducing a second configuration authority.
CLI Product Management remains Commit 004.

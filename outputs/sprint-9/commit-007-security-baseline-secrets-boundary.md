# Sprint 9 Commit 007 - Security Baseline & Secrets Boundary

Status: PASS

## Delivered

- Added the versioned `wpsc.secrets-boundary` contract.
- Added versioned Site-scoped Secret References.
- Added credential injection only through a referenced Site credential store.
- Added cross-Site Secret Reference rejection.
- Added safe public projections with recursive secret redaction.
- Added public-contract guard that rejects sensitive fields before rendering or
  serialization boundaries.
- Preserved the existing private credential file boundary and webhook
  verification flow.

## Secret Flow

```text
Site Credential Store
        -> Secret Reference
        -> Provider Client callback
        -> Provider request

Public Contract / Theme / Cache / Logs / Output
        -> redacted projection only
```

Secret values are available only inside the injected provider callback. The
reference contains Site identity and credential name, never the secret value.

## Protected Boundaries

Secrets are rejected or redacted before entering:

- Rendering Context and Theme.
- Public Runtime contracts.
- Cache and Build artifacts.
- Structured logs and audit events.
- Public static output.

Credential references cannot be reused across Sites. WordPress Application
Passwords, WooCommerce consumer secrets, webhook secrets and auth bridge
secrets remain server-side.

## Validation

```bash
node --test test/secretsBoundaryService.test.js test/siteBackupService.test.js test/operationalObservabilityService.test.js test/runtimeWebhookReceiver.test.js test/customerAuthStrategy.test.js
git diff --check
```

Focused Security, Backup, Observability, Webhook and Customer Auth validation
passed with 10 tests.

## Architecture Result

Commit 007 establishes the secrets boundary without changing provider
authority, Runtime Flow, authentication contracts or Webhook ownership. Access
Control and Operations Authorization remain Commit 008.

# Sprint 6 - Provisioning Foundation Closeout

## Commit

docs(provision): close provisioning foundation workstream

## Scope

Close the Provisioning Engine foundation delivered by Phase 2 commits 001-007
and the cross-module contract documentation delivered by Commit 008.

This is a closeout record, not a claim that the full Sprint 6 Definition of
Done is complete. The Architecture v2 roadmap still schedules shared setup UI,
source registration, webhook processing, and first build in later work.

## Delivered

| Area | Status | Contract |
| --- | --- | --- |
| Site creation | Complete | Isolated site skeleton and metadata |
| Lifecycle events | Complete | Provisioning event stream |
| Transaction safety | Complete | Stable plan and rollback |
| UUID ownership | Complete | Framework-generated site UUID |
| Secret generation | Complete | CSPRNG provider with metadata |
| Environment gate | Complete | Shared normalized environment report |
| Provisioning config | Complete | Versioned, validated, immutable config |
| Contract docs | Complete | Config, environment report, secret provider |

## Architecture Audit

- **Shared infrastructure:** environment validation reuses shared validation
  primitives; no provisioning-specific duplicate checker was introduced.
- **Site isolation:** provisioning creates data only within the repository's
  resolved site root and uses the existing site path policy.
- **Secret boundary:** secret values are not emitted by provisioning events or
  written to public output.
- **Consumer boundary:** environment report and provisioning config have
  stable contracts for the future Setup Service, Browser Wizard, and CLI.

## Verification

```bash
node --test test/packageBoundaries.test.js test/apiCompatibility.test.js test/provisioningConfig.test.js test/provisioningEnvironment.test.js test/provisioningService.test.js test/provisioningSecrets.test.js
git diff --check
```

Expected result:

```text
tests 19
pass 19
fail 0
```

## Deferred Deliberately

- `configHash` for integrity checking and `wpsc doctor`
- Persisted environment-report `checkedAt`
- External secret persistence, rotation, and provider backends
- Shared Setup Service and its Browser/CLI consumers
- Source discovery, registration, disconnect, and connection testing
- Webhook gateway, dispatcher, queue, worker, and first build

## Phase 3 Entry Rule

Phase 3 consumes the contracts documented in `docs/contracts/`. It must not
mutate active provisioning config objects or recreate environment-check
formatting locally.

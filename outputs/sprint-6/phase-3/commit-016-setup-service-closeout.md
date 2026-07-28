# Sprint 6 - Phase 3 Setup Service Closeout

## Commit

docs: finalize Setup Service

## Official Architecture

```text
Provisioning Foundation
        |
        v
Setup Service
   |          |
   v          v
Browser      CLI
  REST      Direct call
```

This is the official WPSC v2 setup architecture. Setup business logic exists
only in Setup Service. Browser, CLI, REST, and future Dashboard adapters must
not copy workflow, validation, or provisioning behavior.

## Phase 3 Delivered

| Commit | Outcome |
| --- | --- |
| 010 | Shared Setup Service, immutable context, event boundary |
| 011 | Runtime Session Manager and repository contract |
| 012 | State Machine and service-owned transition workflow |
| 013 | Browser REST gateway and revision response contract |
| 014 | HTML/CSS/JS Browser Wizard renderer |
| 015 | Direct Setup Service CLI command |
| 016 | Contracts, architecture audit, and closeout |

## Contract Documentation

- `docs/contracts/setup-context.md`
- `docs/contracts/setup-session.md`
- `docs/contracts/setup-presentation.md`
- `docs/contracts/setup-diagnostics.md`
- `docs/setup-service-architecture.md`

## Boundary Audit

- **Provisioning:** owns site creation, UUID, secret, config, environment,
  transaction, and rollback foundations.
- **Setup Service:** owns setup session, context, state, presentation, and
  service orchestration.
- **Browser:** uses REST only; renders server-provided snapshots/diagnostics.
- **CLI:** calls Setup Service directly; renders service-owned output.
- **Dashboard:** may use REST or a direct deployment-appropriate service
  adapter, but never duplicates business logic.

## Phase 4 Handoff

The next focus is Source Registration, then Webhook activation and First Build
readiness. These phases extend Setup Service orchestration and consume the
published contracts. They do not require a redesign of Setup Service, Browser
Wizard, or CLI boundaries.

## Verification

```bash
node --test test/siteSetupCommand.test.js test/setupWizard.test.js test/setupApi.test.js test/setupService.test.js test/setupSessionManager.test.js test/setupStateMachine.test.js test/packageBoundaries.test.js test/apiCompatibility.test.js
node src/cli/index.js site:setup --site company-a --advance
git diff --check
```

## Result

```text
tests 20
pass 20
fail 0
```

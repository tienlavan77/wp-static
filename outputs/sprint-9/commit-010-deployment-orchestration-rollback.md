# Sprint 9 Commit 010 - Deployment Orchestration & Rollback

Status: PASS

## Delivered

- Added the versioned `wpsc.deployment-orchestration` contract.
- Added deployment request and Site-scoped deployment records.
- Added preflight validation before deployment execution.
- Added artifact validation gating: only `ready` or previously deployed
  artifacts can deploy.
- Added injected deployment adapter boundary for deploy and activate.
- Added observable deployment states: `pending`, `deploying`, `activating`,
  `deployed`, `failed`.
- Added active release tracking per Site.
- Added rollback to the previous verified deployment.
- Added artifact release state transitions for deployed and superseded artifacts.

## Deployment Flow

```text
Ready Artifact
    -> Preflight
    -> Deploy Adapter
    -> Activate Adapter
    -> Active Release
    -> Health / Operations inspection
```

## Rollback Flow

```text
Current Active Release
    -> Previous deployed artifact
    -> Preflight
    -> Deploy
    -> Activate
    -> New active release
```

Rollback never invokes Builder or reconstructs content. It reuses an immutable
artifact that has already passed deployment successfully.

## Failure Boundary

- Failed preflight never reaches activation.
- Deployment adapter errors produce a `failed` deployment record.
- A failed deployment does not become active.
- Current active release is preserved until activation succeeds.
- Deployment remains Site-scoped and cannot reference another Site's artifact.

## Validation

```bash
node --test test/deploymentOrchestrationService.test.js test/deploymentArtifactService.test.js test/operationsAuthorizationService.test.js test/siteHealthService.test.js
git diff --check
```

Focused Deployment, Artifact, Authorization and Health validation passed with
6 tests.

## Architecture Result

Commit 010 completes the deployment and rollback lifecycle on top of the
immutable Artifact boundary. It does not become a Build authority, bypass
Scheduler/Queue, mutate provider data or create an alternative Output Pipeline.
Enterprise Runtime Hardening remains Commit 011.

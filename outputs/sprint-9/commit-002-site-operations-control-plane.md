# Sprint 9 Commit 002 - Site Operations & Isolation Control Plane

Status: PASS

## Delivered

- Added the Site Operations Service with versioned `wpsc.site-operations` contract.
- Added one-Site-at-a-time inspection for identity, domains, environment and runtime reference.
- Added injected readers for Runtime, Build, Scheduler, Queue and Deployment state.
- Added Site listing with operational status and identity metadata.
- Added explicit Site enable and disable operations.
- Added immutable operation snapshots and normalized diagnostics.
- Rejected unknown or invalid Site identities.
- Preserved Site Context and Site Registry as the only Site boundaries.

## Control Plane Boundary

```text
Operator
   -> Site Operations Service
   -> Site Registry / Site Repository
   -> Injected state readers
```

The Control Plane observes state and changes only the requested Site's
operational status. It does not manage content, trigger Build, call Scheduler,
access Queue internals or mutate another Site.

## Operational State

```text
active       -> Runtime domain resolution allowed
suspended    -> Runtime domain resolution blocked
deactivated  -> operationally disabled
deleted      -> retained as a lifecycle record, never active
```

Operational status is intentionally separate from Setup and Build `SiteState`.
Disabling a Site therefore does not corrupt its Setup, Build or Runtime state.

## Validation

```bash
node --test test/siteOperationsService.test.js test/siteRegistry.test.js test/siteContext.test.js test/siteRepository.test.js
git diff --check
```

Focused Operations, Registry, Site Context and Repository validation passed with
10 tests.

## Architecture Result

Commit 002 adds operational inspection and isolation controls around the
existing Site Runtime. It does not introduce Content CRUD, a second Build entry
point, a parallel routing system or cross-Site state.

# Sprint 10 Commit 017 - Persisted Dependency Manifest

Status: PASS

## Goal

Persist Site-scoped route dependency knowledge after a successful publish so a
later webhook build can select the affected routes from a verified snapshot.

## Delivered

- Added `createDependencyManifestStore` under Runtime Build ownership.
- Stores a versioned manifest at
  `sites/<siteId>/storage/build/dependency-manifest.json` using temporary-file
  write then rename.
- Stores both `contentToRoutes` and `routeToDependencies` mappings, including
  direct Content, parent Product, term/archive, and embedded Product card
  dependencies.
- Build Integration loads the Site manifest before invoking Runtime Builder V1.
- Runtime Builder V1 requires a usable published manifest before trusting a
  targeted incremental route plan; missing or unmapped entries safely request a
  full build.
- Build Integration writes the new manifest only after Output Pipeline returns
  a successful publish result.
- The generic Builder V1 planner remains compatible for CLI/development callers
  that do not opt into Runtime's persisted-manifest requirement.

## Boundary

```text
Webhook -> Scheduler -> Queue -> Dispatcher -> Build Integration
  -> read Site dependency manifest -> Runtime V1 Builder
  -> Output Pipeline publish -> persist replacement dependency manifest
```

The manifest contains route dependency identifiers only. It does not contain
provider credentials, webhook secrets, or raw source configuration.

## Safety

- A manifest is accepted only when schema version and Site identity match.
- Missing, corrupt, stale-schema, or unmapped dependency data forces a full
  build instead of silently omitting a route.
- A failed Output Pipeline publish cannot update the dependency snapshot.

## Validation

```bash
node --test test/dependencyManifestStore.test.js test/incrementalBuild.test.js \
  test/buildIntegration.test.js test/outputPipeline.test.js \
  test/runtimeWebhookReceiver.test.js
git diff --check
```

Result: 23 tests passed, 0 failed.

## Known Boundary

This commit persists and consumes dependency knowledge. Targeted Source fetching,
artifact-level planning, deletion/rename cleanup, and atomic snapshot recovery
remain the explicitly planned scopes of C018-C021.

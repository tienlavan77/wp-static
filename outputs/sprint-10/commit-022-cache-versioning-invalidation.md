# Sprint 10 Commit 022 - Cache Versioning and Precise Invalidation

Status: PASS

## Goal

Prevent a published Site from serving cache entries belonging to an earlier
Build snapshot after new HTML and generated artifacts have been published.

## Delivered

- Site Cache keys are now versioned by `siteId + buildId + service + resource
  + key`.
- Every Site Cache starts in an explicit `initial` snapshot namespace.
- Build Integration activates the new cache Build namespace only after Output
  Pipeline has completed a successful publish.
- Activating a new Build snapshot invalidates entries from the prior snapshot
  for that Site only.
- Runtime's Site Cache facade exposes `activateBuild(siteId, buildId)` while
  preserving per-Site isolation for shared cache storage.
- Existing webhook invalidation remains immediate after Scheduler accepts a Job;
  published snapshot activation remains strictly post-publish.

## Lifecycle

```text
Webhook accepted
  -> invalidate affected current cache entries
  -> Build and staging publish
  -> Output Pipeline success
  -> activate Site Build cache namespace
  -> purge prior Site snapshot cache entries
```

No cache version changes when staging/output publish fails.

## Boundary

- Scheduler, Queue, and Dispatcher do not manage cache versions.
- Build Integration owns post-publish cache snapshot activation.
- Output Pipeline remains the only writer to Site public output.
- Cache versioning does not validate output files; C025 owns output integrity
  verification.

## Validation

```bash
node --test test/siteCacheService.test.js test/buildIntegration.test.js \
  test/runtimeWebhookReceiver.test.js
git diff --check
```

Result: 13 tests passed, 0 failed.

## Test Note

`test/siteRuntimeInstance.test.js` remains an unrelated legacy UI assertion:
it expects `Set up company-a` while the active Vietnamese Setup view renders
`Chao mung den voi company-a`. It is outside the C022 cache contract and was
not changed by this commit.

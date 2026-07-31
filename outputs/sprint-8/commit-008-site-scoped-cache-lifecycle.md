# Sprint 8 Commit 008 - Site-scoped Cache Lifecycle

Status: PASS

## Delivered

- Versioned Site Cache Service contract.
- Deterministic keys in the form `siteId + service + resource + key`.
- Shared cache domains for Source, Commerce, Content, Search, Media, Build,
  Runtime and Session.
- Read-through cache API with hit/miss metrics.
- Site-safe get, set, remove and targeted invalidation.
- Publishing and commerce invalidation mapping.
- Publish Event Coordinator integration after successful Scheduler queueing.
- Cache remains an acceleration layer; providers and persisted Site data remain
  the source of truth.

## Boundary

```text
Provider / Build / Runtime Data
  -> Site-scoped Cache
  -> Shared Service Consumer
```

Site A and Site B cannot read or invalidate each other's entries, even when a
storage implementation is shared. Cache events with the wrong Site Context are
rejected.

## Validation

```bash
node --test test/siteCacheService.test.js test/publishEventCoordinator.test.js test/performanceCache.test.js test/searchService.test.js test/mediaService.test.js test/runtimeWebhookReceiver.test.js
node --check framework/src/cache/createSiteCacheService.js
git diff --check
```

Focused Site Cache, publishing, Webhook Runtime, Builder cache, Search and Media
validation passed with 17 tests.

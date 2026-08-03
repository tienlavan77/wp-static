# Sprint 10 Commit 020 - Deletion, Rename, and Publish-State Safety

Status: PASS

## Goal

Prevent stale public output when Source Content is deleted, unpublished, or
renamed, while preserving existing Scheduler, Queue, Dispatcher, and Output
ownership.

## Delivered

- Webhook normalization preserves `previousSlug`, `previousUrl`, and current
  URL metadata when supplied by a provider.
- Publish events retain normalized immutable `changes` metadata in the Job in
  addition to existing compact `changed` hints.
- Scheduler and Dispatcher continue to forward immutable metadata only; they
  do not apply Build business logic.
- A Build transition plan forces full Source reconciliation and full output
  replacement for `delete` and `unpublish` events.
- Rename events with old/new identity force a full build and add a Site Route
  Policy redirect from old path to new path.
- Builder writes a browser redirect fallback for the old static route. The
  Route Manifest records the intended permanent redirect status (`301`).
- Full Output Pipeline replacement removes stale old HTML, fragments, route
  data, search index entries, sitemap URLs, media metadata, and manifests.

## Important Distinctions

- Route SEO data is route-scoped; Site-wide SEO-derived artifacts (sitemap,
  robots, search and Site manifests) remain global.
- Route-local media processing plus global media manifest is classified but not
  yet integrity-proven. C025 owns verification of a consistent public snapshot.
- Artifact Planner classifies responsibility only. It does not validate or
  publish output.
- An HTML redirect fallback changes browser location but is not itself an HTTP
  `301`; enforcing HTTP status remains a publish/deployment concern.

## Validation

```bash
node --test test/contentTransitionPlan.test.js test/publishEventCoordinator.test.js \
  test/jobDispatcher.test.js test/scheduler.test.js test/buildIntegration.test.js \
  test/buildPipeline.test.js test/outputPipeline.test.js test/incrementalBuild.test.js
git diff --check
```

Result: 32 tests passed, 0 failed.

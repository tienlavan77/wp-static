# Sprint 10 - Build Completion Extension

Status: Planned

## Context

Sprint 10 commits 001-012 remain the frozen Product Packaging and Distribution
baseline. Commit 016 begins a narrowly scoped post-freeze extension to complete
the production Build Runtime. It does not reopen Product, Runtime, Scheduler,
Theme, Content Model, or Source contracts.

The goal is to make an incremental webhook build both safe and genuinely
targeted: a change to one entity must update every dependent route and artifact
without writing unaffected HTML routes or leaving stale public output.

## Target Flow

```text
Source change / webhook
  -> identify entity and action
  -> dependency manifest lookup
  -> plan affected routes and artifacts
  -> invalidate affected Site cache entries
  -> fetch and render the minimum safe set
  -> verify staging snapshot
  -> publish atomically
  -> persist build telemetry and dependency snapshot
```

## Contract Rules

- Build Context remains immutable.
- Scheduler triggers, Queue stores Jobs, Dispatcher executes Jobs, and Build
  Integration owns the Build lifecycle.
- Output Pipeline remains the only filesystem writer for `sites/<site>/public`.
- Dependency manifests, caches, logs, support bundles, and generated artifacts
  must never contain plaintext credentials or secrets.
- An incomplete or incompatible dependency snapshot must fall back to a safe
  full build; it must never silently omit an affected route.
- A failed build must leave the last verified public snapshot available.

## Commit Sequence

### Commit 016 - Dependency-Aware Incremental Invalidation

Status: Implemented, pending repository commit

- Discover nested Product dependencies in route Content data.
- Rebuild direct, archive, parent, and embedded-Product routes.
- Invalidate Site Cache after the Scheduler accepts a webhook Job.
- Fall back to a full build for an unmappable changed item.
- Replace full output snapshots to remove files from deleted routes.

### Commit 017 - Persist Dependency Manifest for Targeted Rebuilds

Goal: make route dependency knowledge durable between builds.

- Persist a versioned Site-scoped manifest only after a successful publish.
- Store both `contentToRoutes` and `routeToDependencies` mappings.
- Associate every manifest with `siteId`, `buildId`, schema version, and source
  content version/hash when available.
- Use the persisted manifest for webhook impact lookup before compiling a full
  Site plan.
- Fall back safely when the manifest is missing, invalid, stale, or cannot
  resolve the incoming entity.

Must not:

- Persist credentials, raw provider configuration, or webhook secrets.
- Treat an unverified manifest as permission to skip a full build.

### Commit 018 - Targeted Content Refresh

Goal: fetch the smallest safe source data set for a verified impact plan.

- Fetch changed entities and their required parent/taxonomy dependencies.
- Use a full source refresh whenever an action, entity version, or dependency
  cannot be proven complete.
- Preserve the existing Source Adapter contract and diagnostics contract.

### Commit 019 - Incremental Artifact Planner

Goal: make non-HTML outputs explicit dependencies of a change.

- Plan HTML, fragments, route/content manifests, search entries, SEO JSON-LD,
  sitemap sections, and media metadata separately.
- Regenerate only affected artifacts where their contracts permit it.
- Retain deliberate regeneration of global artifacts when correctness requires
  a Site-wide view.

### Commit 020 - Deletion, Rename, and Publish-State Safety

Goal: prevent stale public data.

- Handle deleted entities, slug changes, taxonomy moves, and publish/unpublish
  transitions.
- Remove obsolete HTML, fragments, search entries, sitemap URLs, cache entries,
  and dependency records.
- Produce a controlled redirect or 404 according to the routing policy.

### Commit 021 - Atomic Publish and Recovery

Goal: protect the last known-good public Site.

- Build into an isolated staging snapshot.
- Validate the snapshot before publish.
- Publish the output and matching dependency manifest as one recoverable unit.
- Recover cleanly from an interrupted build or Runtime restart.

### Commit 022 - Cache Versioning and Precise Invalidation

Goal: prevent a mixed snapshot of fresh HTML and stale derived data.

- Version cache keys by Site and Build/content version.
- Invalidate route and artifact cache entries from the impact plan.
- Verify that HTML, SEO, search, sitemap, fragments, and manifests refer to a
  compatible output snapshot.

### Commit 023 - Build Telemetry and Durable History

Goal: replace estimates with evidence from real builds.

- Persist total and phase timings: source fetch, normalization/compile,
  dependency planning, render, assets/media, output publish, and global
  artifacts.
- Persist mode, fallback reason, routes planned/written, artifact counts, and
  cache hit/miss statistics.
- Expose redacted build history to CLI, Dashboard, audit, and support bundle.

### Commit 024 - Build Coalescing and Concurrency Protection

Goal: avoid redundant Site builds during webhook bursts.

- Preserve the one-running-Job-per-Site invariant.
- Coalesce compatible pending changes by entity and impact plan.
- Keep Scheduler retry ownership and Queue lifecycle ownership unchanged.

### Commit 025 - Output Integrity Verification

Goal: reject incomplete snapshots before they become public.

- Verify route manifest to output-file consistency.
- Verify referenced assets/media, search, sitemap, SEO, and dependency manifest
  compatibility.
- Emit actionable diagnostics and retain the previous public snapshot on error.

### Commit 026 - Incremental Build E2E and Performance Validation

Goal: prove the workflow under normal and failure conditions.

- Cover Product, Page/Post, taxonomy, deletion, slug change, media change, and
  embedded Product dependencies.
- Cover duplicate webhooks, source timeout, failed staging build, and Runtime
  restart recovery.
- Establish full and incremental timing baseline on a representative Site.

### Commit 027 - Build Architecture Freeze

Goal: close the Build Completion extension.

- Audit contracts, boundaries, diagnostics, secrets, fallback behavior, and
  output ownership.
- Publish benchmark and E2E evidence.
- Freeze Build Runtime contracts without introducing new business features.

## Definition of Done

- A single Product change rebuilds only its proven dependent routes and
  artifacts.
- Deleted or renamed Content cannot leave stale public files or metadata.
- Missing dependency knowledge fails safely to a full build.
- Failed or interrupted builds preserve the last verified public Site.
- Webhook bursts do not create redundant active builds for a Site.
- Build history identifies where time was spent and why a full fallback ran.
- E2E tests prove correctness, recovery, and cache/output consistency.

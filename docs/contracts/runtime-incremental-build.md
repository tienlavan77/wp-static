# Runtime Incremental Build Contract

## Purpose

Runtime uses the Builder V1 incremental build engine for every content change.

## Persisted Dependency Manifest

After a successful Runtime publish, WPSC stores a Site-scoped dependency
snapshot at:

```text
sites/<siteId>/storage/build/dependency-manifest.json
```

The snapshot is versioned and maps both `content -> routes` and
`route -> dependencies`. A subsequent webhook build uses this published
snapshot to identify a targeted set of routes. The manifest is written only
after the Output Pipeline has successfully published the matching build output.

If the snapshot is absent, incompatible, belongs to another Site, or has no
entry for the changed entity, Runtime performs a safe full build. Dependency
manifests must not contain provider credentials, webhook secrets, or raw source
configuration.

## Targeted Source Refresh

Runtime also keeps a published Content Snapshot at:

```text
sites/<siteId>/storage/build/content-snapshot.json
```

For a Product, Page, or Post webhook, Runtime may request only the changed
record from a provider and merge it into this snapshot. It can do so only when
the Content Snapshot and Dependency Manifest belong to the same published
`buildId`. Taxonomy, menu, media, site-wide, deletion, renamed, missing, or
otherwise incomplete provider results always fall back to a full Source read.
The snapshot is content data only and must not contain credentials or secrets.

## Incremental Artifact Plan

Every Builder V1 build produces an explicit artifact plan in the build manifest.
For a verified incremental build, route-scoped artifacts are limited to the
affected route set:

- HTML document and route serve alias
- navigation fragment
- route data JSON
- media processing referenced by those routes

The following artifacts remain deliberately Site-wide because their public
contract depends on a complete Site view: search index, normalized content
store, media manifest, route manifest, template manifest, sitemap, robots,
runtime/static assets, admin app, and build/asset manifests. This is a
correctness decision, not an untracked full rebuild.
It does not build a single HTML file in isolation. A changed source item is
translated into affected public routes, then Builder V1 refreshes both those
routes and the shared build artifacts needed to serve a consistent Site.

## Architecture

```text
CLI or WordPress Webhook
        |
        v
Scheduler -> Job Queue -> Dispatcher
        |
        v
Build Integration
        |
        v
Builder V1: Content Graph -> Route Dependency Graph -> Incremental Planner
        |
        v
Staging Output -> Runtime Output Pipeline -> sites/<site>/public/dist
```

No client calls the queue, dispatcher, or Builder V1 directly. The Scheduler
is the single entry point for both manual and webhook-triggered rebuilds.

## CLI

The Runtime command is:

```sh
node framework/src/cli/index.js runtime:build --site <site-id> --config runtime.config.js
```

With no `--changed` value, Runtime performs a full build.

To request an incremental build, repeat `--changed` as needed:

```sh
node framework/src/cli/index.js runtime:build \
  --site tinsinhphat \
  --config runtime.config.js \
  --changed product:bao-thu
```

## Changed Hint Format

| Hint | Meaning |
| --- | --- |
| `product:<id-or-slug>` | A WooCommerce product changed. |
| `post:<id-or-slug>` | A WordPress post changed. |
| `page:<id-or-slug>` | A WordPress page changed. |
| `term:<taxonomy>:<slug>` | A taxonomy term changed, for example `term:product_cat:bao-thu`. |
| `menu:<id-or-slug>` | A navigation menu changed. |
| `theme:<id-or-slug>` | A shared theme/layout dependency changed. |
| `site:seo` | A site-wide setting changed, such as canonical URL or SEO policy. |

Examples:

```sh
# Product route and its affected product category archives.
node framework/src/cli/index.js runtime:build --site tinsinhphat --changed product:bao-thu

# Product category archive and its paginated archive routes.
node framework/src/cli/index.js runtime:build --site tinsinhphat --changed term:product_cat:bao-thu

# Shared navigation or theme dependency: all dependent routes.
node framework/src/cli/index.js runtime:build --site tinsinhphat --changed menu:primary --changed theme:layout
```

## Rebuild Scope

Builder V1 evaluates each hint with the Route Dependency Graph.

- A changed product rebuilds its product route and every archive route that contains it.
- A changed page or post rebuilds its route and any related archive route.
- A changed term rebuilds its archive route and archive pagination.
- A changed menu, media item, or theme/layout dependency rebuilds every dependent route.
- A changed site setting rebuilds every route because canonical metadata and shared SEO outputs depend on the Site identity.
- Multiple hints are combined into one immutable Job snapshot and one publish operation.

## Required Shared Artifact Refresh

Every incremental build refreshes the shared output contract, even when only
one public route changed:

- route data and SPA data for affected routes;
- fragments for affected routes;
- normalized content store;
- search index;
- SEO output: `sitemap.xml` and `robots.txt`;
- `.wpsc/manifest.json` and `.wpsc/assets.json`;
- template manifest;
- Builder runtime assets and declared public/theme assets;
- Builder plugin lifecycle hooks.

The Output Pipeline is the only component allowed to publish staged files to:

```text
sites/<site-id>/public/dist/
```

## Webhook Mapping

The WordPress Webhook Bridge sends a normalized payload containing `changed`.
Runtime validates the webhook secret and Site UUID, maps each changed item to
the formats above, and enqueues the result through the Scheduler. A webhook
never calls Build Engine or Output Pipeline directly.

For example, this payload:

```json
{
  "source": "wordpress",
  "action": "update",
  "changed": [
    { "type": "product", "slug": "bao-thu" }
  ]
}
```

creates the immutable job input:

```json
{
  "changed": ["product:bao-thu"],
  "triggerType": "webhook"
}
```

## Operational Rule

Run one full Runtime build after a new Site, source, theme, or Runtime version
is configured. Use incremental builds only after a valid full output exists.

## Transition Safety

Webhook Job metadata preserves normalized change events in addition to compact
`changed` hints. Delete and unpublish events force a full Source reconciliation
and full output replacement, which removes old route HTML, fragments, route
data, search entries, sitemap URLs, cache-derived artifacts, and dependency
records together.

A rename with `previousSlug`/`previousUrl` creates a redirect policy entry and
a browser redirect fallback at the old static route. The route policy retains
the intended HTTP status (`301` by default); a web-server HTTP redirect is a
publish/deployment concern and is not claimed merely because an HTML fallback
exists.

Route SEO data is route-scoped and is regenerated with route data. Sitemap,
robots, search, media manifest, route/content manifests, and other Site-wide
SEO-derived artifacts remain global. Artifact planning does not validate or
publish a snapshot; C025 owns integrity verification.

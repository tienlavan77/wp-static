# Runtime Incremental Build Contract

## Purpose

Runtime uses the Builder V1 incremental build engine for every content change.
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

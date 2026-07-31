# Sprint 7 Commit 010 - WordPress to Static Website E2E

## Delivered

- A deterministic E2E validation using the real WordPress Source Adapter.
- WordPress Pages, Posts, Authors, Terms, Menus and Media cross the normalized
  content boundary into the Runtime Builder.
- The Scheduler, Queue and Dispatcher execute the initial publication.
- Theme Composition and Builder V1 publish the Site through the Output Pipeline
  into the Site-scoped `public/dist` directory.
- Search, Media and Route manifests retain the active Site identity.
- An authenticated WordPress webhook becomes a normalized publish event,
  preserves its changed-content hint and rebuilds the affected website.
- A second Site in the same Runtime workspace remains untouched.

## Validated Flow

```text
WordPress
  -> WordPress Source Adapter
  -> Normalized Content and Collections
  -> Site Context
  -> Shared Navigation, Media, Routing and Search Services
  -> Theme Composition
  -> Builder V1
  -> Output Pipeline
  -> sites/<site>/public/dist
```

```text
WordPress Change
  -> Authenticated Webhook
  -> Publishing Coordinator
  -> Scheduler
  -> Queue
  -> Dispatcher
  -> Builder
  -> Updated Static Website
```

## Architecture Boundary

The test adds no Content CRUD and no alternative publishing path. WordPress
remains the content authority. The Webhook Receiver authenticates and
normalizes input, the Scheduler owns scheduling, the Queue owns Job state, the
Dispatcher executes, the Builder owns build semantics, and the Output Pipeline
is the filesystem publisher.

## Validation

```bash
node --test test/sprint7WebsiteE2E.test.js
node --test test/publishEventCoordinator.test.js test/siteContext.test.js
node framework/src/cli/index.js --help
git diff --check
```

# Sprint 6 - Post-Freeze Runtime Implementation Summary

Date: 2026-07-29

## Scope And Git Status

Sprint 6 was frozen by commit `fb44baf` (`feat(sprint-6): complete phases 3-7 site runtime platform`).

The first post-freeze delivery is committed:

| Commit | Git status | Delivery |
| --- | --- | --- |
| C48 | `c24b80f` | CLI site creation and Runtime serving commands |

The Runtime productization work from C49 onward is implemented in the shared worktree but has not yet been separated into clean Git commits. It must be reviewed, grouped, tested, and committed deliberately; it must not be represented as already frozen.

## Official Sprint 6 Foundation

Sprint 6 established the stable WPSC v2 architecture:

```text
Provisioning Engine
        -> Setup Service
        -> Browser REST Gateway / CLI direct client
        -> Site Runtime
        -> Scheduler -> Queue -> Dispatcher -> Build Engine
```

Completed frozen foundations:

- Phase 1: site repository, site metadata, lifecycle state and cross-site filesystem isolation.
- Phase 2: provisioning plan, transaction/rollback, events, UUID, secret provider, immutable provisioning config, environment diagnostics and contracts.
- Phase 3: shared Setup Service, sessions, state machine, REST gateway, browser wizard and CLI setup client.
- Phase 4: source adapter contract, source registration, webhook lifecycle and ready-for-first-build decision.
- Phase 5: build context/result contracts, build state machine, content pipeline, theme renderer, output pipeline and build integration.
- Phase 6: Scheduler, Job Queue, Dispatcher, retry/lock policy and Browser/CLI/Webhook trigger gateways.
- Phase 7: runtime bootstrap, installer, dashboard, source/webhook registration, first build integration, E2E validation and architecture freeze.

The canonical architecture and final closeout are recorded in `Architecture-v2-01-final.md`, `commit-047-sprint-6-final-closeout.md`, and `sprint-6-completion-report.md`.

## Post-Freeze Runtime Productization

### C48 - Runtime CLI

Delivered and committed:

- `site:create` provisions a Site Runtime skeleton.
- `runtime:serve` starts the Runtime HTTP service.
- A site gets `public/index.php`, `config/`, `storage/` and its isolated public output root.
- Runtime configuration is read from `runtime.config.js`.

Operational rule:

```text
Runtime service and Runtime builds run as www-data.
```

### C49 - Browser Runtime Views

Implemented:

- Browser Installer view when the site is not configured.
- Runtime Dashboard after configuration.
- Dashboard APIs remain thin gateways into Setup/Runtime services.
- The browser does not own workflow, config validation, secrets, source registration or build orchestration.

### C50-C55 - WordPress And WooCommerce Runtime Source

Implemented:

- WordPress Runtime Source Adapter reads WordPress pages/posts and WooCommerce data.
- Source credentials are stored server-side in the Site credential store.
- The Dashboard supports endpoint, WordPress username, Application Password, WooCommerce consumer key and consumer secret.
- Secret fields use masked placeholder behavior; saved secrets remain server-side.
- Check Connection is a non-persisting validation action.
- Save/Connect Source is the explicit persist-and-register action.
- WooCommerce is optional: if consumer credentials are absent or invalid, a normal WordPress content site can still register and build.
- Product variations are included in the Runtime content reader so the storefront can render selectable product options.

Credential boundary:

```text
Application Password -> Runtime to WordPress source API
WooCommerce key/secret -> Runtime to WooCommerce API
Customer password -> Customer Account login only
```

### C51 And Webhook Runtime

Implemented:

- WPSC Webhook Bridge receives Runtime registration data.
- Runtime persists webhook metadata and validates the webhook handshake.
- Webhook receiver is a thin gateway into Scheduler; it does not build directly.
- A verified WordPress webhook configuration was observed for Site `tinsinhphat`.

The WordPress bridge plugin remains modular:

- `wpsc-webhook-bridge`: webhook registration and delivery.
- `wpsc-auth-bridge`: customer authentication endpoints.
- `wpsc-zoho-mail-bridge`: transactional mail transport.

Future consolidation into one installable WPSC Bridge plugin is documented, but endpoint and secret boundaries remain separate.

### C56-C58 - Source Dashboard UX Hardening

Implemented behavior:

- Existing source data is loaded back into the Dashboard.
- Non-sensitive values are prefilled.
- Persisted secrets are displayed as password-field sentinel values, never as their real value.
- Empty credential fields show useful placeholders.
- Users can replace only the field they want to change.
- Connection diagnostics use the shared `code`, `message`, `severity` contract.
- Connect Source is always visible; it does not require the user to re-enter unchanged persisted credentials.

## Builder V1 Runtime Adoption

The Runtime no longer maintains a competing render-first build path. The canonical Runtime build path is:

```text
Runtime Content Reader
        -> Builder V1 compiler and route planner
        -> Builder V1 theme/template resolution
        -> Builder V1 assets, data, fragments, SEO and manifests
        -> Output Pipeline
        -> sites/<site>/public/dist
```

Implemented Runtime Builder V1 bridge:

- `createRuntimeContentReader()` returns normalized content and collections.
- `compilePreparedSite()` feeds Runtime-read content into the V1 compiler without rereading a source.
- `createRuntimeV1Builder()` uses isolated staging output per build.
- `createSharedStorefrontBuildConfig()` binds the shared Storefront Theme and its page/product/archive/account/search layouts.
- `createRuntimeSystemContents()` adds runtime-owned `/account`, `/search` and `/404` routes before V1 route planning.
- `createBuildIntegration()` is now the orchestrator of Reader -> V1 Builder -> Output Pipeline.

Builder V1 remains the owner of:

- template selection and layout rendering;
- public/theme assets;
- route data and SPA fragments;
- normalized content store;
- search index;
- SEO, sitemap and robots;
- manifests and template manifest;
- plugin hooks;
- incremental build planning.

## Runtime Incremental Build

Implemented CLI contract:

```sh
node src/cli/index.js runtime:build \
  --site <site-id> \
  --config runtime.config.js \
  --changed product:<slug>
```

Supported change hints include `product`, `page`, `post`, `term:product_cat`, `menu` and `theme`.

The changed route is rebuilt together with shared artifacts needed for consistency:

- route data and SPA data;
- fragments;
- content store;
- search index;
- sitemap and robots;
- manifests;
- theme/public assets;
- plugin hooks.

No gateway bypasses Scheduler for a scheduled/webhook-triggered build.

## Shared Storefront Theme

Implemented theme capabilities:

- distinct layouts for page, product, product category archive, account and search;
- product gallery, product tabs, variation selection, cart and checkout presentation;
- account, order history, address/profile panels and account login shell;
- search, 404 page and enhanced navigation;
- static compiled `storefront.css` and `wpsc-enhanced-navigation.js` outputs.

Recent correction:

- Removed a dangling CSS URL to `order-online-jpeg-daff404e7f.webp`.
- That asset did not exist in Theme source, Builder V1 cache or `dist/assets/media`, so it could never be published.
- The cart heading retains its gradient background without a false 404 request.
- A regression assertion was added for that URL.

## Customer Account Runtime

The customer account flow is separate from source credentials:

```text
Browser /account
        -> Runtime /api/auth/* and /api/account/*
        -> Runtime HTTP-only wpsc_session
        -> WordPress Auth Bridge
        -> WooCommerce customer and order APIs
```

Implemented:

- WordPress Auth Bridge login/register/lost-password/reset/change-password/email verification endpoints.
- Runtime-owned customer session store.
- Account profile, address and order service adapters.
- `/account` is intentionally a full-page navigation, not a fragment-swapped SPA route, because it owns live session state.

Critical real-environment correction:

- The PHP front controller initially failed to forward browser `Cookie` headers to Node Runtime and failed to relay Node `Set-Cookie` headers back to the browser.
- This caused `GET /api/account/me` to return `authenticated: false` after a successful login.
- The front controller template and the current Site entry point now forward both headers.
- Customer login has subsequently succeeded in the real Runtime deployment.

## Runtime Validation Evidence

Validated during real deployment for `tinsinhphat`:

- Runtime service is started by `www-data`.
- Site source registration succeeds against `https://api.tinsinhphat.com`.
- Webhook registration and verification succeed after network and callback configuration are correct.
- First build succeeds and publishes V1 output under `sites/tinsinhphat/public/dist`.
- Domain resolves to the generated static site through Nginx/PHP front controller.
- Account login succeeds through Runtime -> WordPress Auth Bridge after the session cookie proxy correction.
- Phase 7 Runtime E2E test was previously reported as PASS in the real environment.

## Operational Rules Learned In Production

### Filesystem Ownership

All Build and Runtime output must be produced by `www-data`:

```sh
sudo -u www-data /usr/bin/node src/cli/index.js runtime:build \
  --site tinsinhphat \
  --config runtime.config.js \
  --project /home/data/sites/wp-static
```

Do not run `runtime:build` as `root` or the normal SSH user. Old root-owned files in `.wpsc/` prevent the Build Output Pipeline from replacing manifests.

### Workspace Mapping

The local workspace is mapped to the VPS project:

```text
/Users/tienlavan/Documents/wpstatic
        <->
/home/data/sites/wp-static
```

Code changes are made in the local workspace and are visible on the VPS mapping. No separate rsync deployment is required. Runtime commands are executed on the VPS only to build, serve, or validate the running system.

### Runtime Boundary

- Nginx/PHP front controller serves Builder V1 static files from `public/dist`.
- `/api/*`, `/webhook/*`, `/dashboard/*` and `/installer/*` proxy to Node Runtime.
- Static routes do not call Node Runtime.
- Node Runtime owns dynamic session/API behavior.

## Current Status And Remaining Work

Working now:

- Site skeleton creation and Runtime serving.
- Browser installer/dashboard.
- WordPress source registration and optional WooCommerce enrichment.
- Webhook registration/verification and Scheduler entry.
- Full Builder V1 static build and incremental build contract.
- Shared Storefront layouts and product variation rendering.
- Customer authentication session handoff through the Runtime front controller.

Still requires controlled follow-up before another freeze:

1. Run a fresh `www-data` build after the latest Storefront CSS correction, then hard-refresh the browser to confirm the final CSS asset 404 has disappeared.
2. Validate the complete logged-in account flow: profile, addresses, order list and order detail using a real WooCommerce customer.
3. Audit all post-freeze worktree changes, split them into coherent commits (C49 onward), and run the full test suite in an environment with WordPress fixture/network support.
4. Remove or migrate only confirmed obsolete Runtime bridge files after that audit; do not delete broad project directories.
5. Keep the future WPSC Bridge plugin consolidation as a separate task after Account E2E is stable.

## Final Architecture Position

Nothing after the Sprint 6 freeze replaces the architecture. The post-freeze work productizes it on a real site:

```text
Install WPSC
        -> Create Site Runtime skeleton
        -> Point domain at the skeleton
        -> Open installer/dashboard in browser
        -> Connect WordPress source
        -> Register webhook
        -> Build through Scheduler and Builder V1
        -> Serve static storefront
        -> Use Runtime APIs only for dynamic behavior such as Account
```

The frozen ownership boundaries remain intact: Provisioning owns foundation, Setup owns workflow, Scheduler owns build admission, Build Engine orchestrates, Builder V1 owns static output semantics, Output Pipeline owns publishing, and Runtime owns dynamic site APIs and sessions.

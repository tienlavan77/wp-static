# WPSC Architecture

## Status

Architecture status: `FROZEN FOUNDATION WITH PRODUCTIZATION EXTENSIONS`

WPSC is a shared Runtime Platform. A single installation can operate multiple
isolated Sites. The platform provides lifecycle, source connection, scheduling,
building, output, operations, and product tooling; a Site provides identity,
configuration, credentials, content, and output.

## Runtime Model

```text
Shared Runtime Platform
  config/runtime-sites.json
    hostname -> siteId
  runtime.config.js
    dependency composition, adapter registry, Runtime defaults
  config/runtime.env
    private operational environment

Site
  sites/<site-id>/config/
  sites/<site-id>/storage/
  sites/<site-id>/public/
  sites/<site-id>/public/dist/
```

The root Runtime configuration is not a Site configuration. It must not embed
a Site name, Site credentials, or Site-specific source metadata. Site data is
persisted below that Site's root only.

## Domain Request Flow

```text
Browser
  -> Nginx virtual host for the requested hostname
  -> sites/<site-id>/public/index.php
  -> static file from public/dist when it exists
  -> Node Runtime for Runtime routes and missing static routes
  -> Site Resolver reads hostname -> siteId
```

`public/index.php` is a thin PHP front controller. It does not contain Setup,
Scheduler, Build, or provider logic. It proxies only Runtime routes to the
origin supplied through `WPSC_RUNTIME_ORIGIN`.

## Control Plane

```text
Installer / Dashboard / CLI / Webhook Gateway
  -> Setup Service or Scheduler
  -> persisted Site metadata and configuration
```

The browser is a control-plane client, not a source of authority. A client may
not provide a trusted Site identity; the Runtime derives `siteId` from the
request hostname. Diagnostics use one contract across Setup, Build, and Runtime:

```js
{ code, message, severity }
```

The Browser Notice System maps that stable contract to user-facing copy. It
does not alter the underlying diagnostic data.

## Site Lifecycle

```text
Site Skeleton
  -> SETUP_REQUIRED
  -> Source registration
  -> Webhook registration when supported
  -> READY_FOR_FIRST_BUILD
  -> BUILDING
  -> RUNNING | ERROR
```

`READY_FOR_FIRST_BUILD` means only that the Site is eligible for a Build. It
does not mean a Build has started, is running, or has completed.

## Build And Scheduler Boundaries

```text
Gateway
  -> Scheduler
  -> Queue
  -> Dispatcher
  -> Build Engine
  -> Content Reader
  -> Normalize -> Transform -> Filter -> immutable Content Model
  -> Theme Renderer
  -> Output Pipeline
  -> sites/<site-id>/public/dist
```

### Ownership

| Component | Owns | Must not own |
| --- | --- | --- |
| Gateway | Request receipt and fixed trigger type | Build, Queue, or Scheduler policy |
| Scheduler | Tick, retry policy, enqueue lock, trigger evaluation | Build logic |
| Queue | Pending, running, immutable finished Jobs | Dispatcher or Build Engine |
| Dispatcher | Claim Job, call Build Engine, record success/failure | Build business logic |
| Build Engine | Build lifecycle and Build Result | filesystem output |
| Content Pipeline | Source-independent immutable Content Model | HTML, assets, output |
| Theme Renderer | Content Model -> logical HTML document | Source access or filesystem writes |
| Output Pipeline | Deterministic Site-local output writes | Build lifecycle decisions |

Only the Output Pipeline writes Site generated output. It may write only inside
the resolved Site's `public/dist` directory.

## Source, Webhook, And Credentials

Sources are capabilities. WordPress is supported; WooCommerce is optional.
A blog-only Site must be allowed to connect with WordPress credentials alone.
When WooCommerce credentials are supplied, both Consumer Key and Consumer
Secret are required and validated together.

```text
Source Adapter
  -> one provider API call per adapter operation
  -> normalized result and diagnostics
```

Adapters do not retry. Retry policy belongs to the Scheduler. Runtime-generated
Site UUIDs and webhook secrets are private Site configuration. Webhook callback
URLs resolve from the requesting Site's registered domain, not a fixed first
Site domain.

## Production Provisioning

```text
wpsc platform:provision
  -> generic Runtime configuration when absent
  -> private runtime.env when absent
  -> shared systemd Runtime service artifact
  -> per-Site Nginx virtual-host artifact
  -> reviewed activation instructions
```

The CLI never executes privileged operations automatically. An administrator
activates the generated systemd and Nginx artifacts explicitly. This keeps the
product boundary clear: WPSC prepares deterministic configuration; the host
administrator grants operating-system authority.

## Dependency Direction

```text
CLI / Browser / HTTP
  -> Product, Runtime, Site, Setup, Scheduler, Build services
  -> Source, Theme, Output adapters
  -> Shared utilities
```

Shared utilities do not depend on feature modules. Runtime composition injects
dependencies. Components do not instantiate unrelated implementations simply
to bypass their boundary.

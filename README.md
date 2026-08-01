# WPSC

WPSC is a static website and commerce platform for operating multiple Sites from
one shared Runtime. It connects a Site to WordPress (optionally WooCommerce),
normalizes source data, builds static output, and retains a small Runtime for
setup, operations, account, checkout, and webhook-driven publishing.

It is not a WordPress theme and it is not a one-off static-site generator.
WPSC owns the static delivery pipeline; WordPress remains the editorial and
commerce source of truth.

## Product Flow

```text
Provision WPSC Runtime Platform
  -> Create a Site skeleton
  -> Point a domain to the Site
  -> Complete browser Setup
  -> Connect WordPress / optional WooCommerce
  -> Register Webhook
  -> Run the first build
  -> Serve the static website
```

## Architecture At A Glance

```text
Domain request
  -> Site public/index.php
  -> static public/dist when available
  -> shared Node Runtime for control-plane and API routes

Gateway -> Scheduler -> Queue -> Dispatcher -> Build Engine
Build Engine -> Content Pipeline -> Theme Renderer -> Output Pipeline
```

One Runtime resolves a hostname to a Site through `config/runtime-sites.json`.
Each Site has its own source configuration, credentials, webhook secret, build
state, storage, and static output beneath `sites/<site-id>/`.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for the ownership and boundary rules.

## Requirements

- Node.js 20 or later
- PHP-FPM and Nginx for the Site front controller
- WordPress REST API for a real content source
- WooCommerce REST API only when commerce is enabled

## CLI

The package exposes `wpsc`. From a source checkout, use the equivalent command:

```bash
npm run wpsc -- --help
```

Useful commands:

```bash
# Create the isolated Site skeleton and its initial domain mapping.
wpsc site:create --site company-a --domain company-a.example

# Generate production Runtime, environment, systemd, Nginx, and activation artifacts.
wpsc platform:provision \
  --project /srv/wpsc \
  --site company-a \
  --domain company-a.example \
  --runtime-origin http://127.0.0.1:8787

# Start the shared Runtime. One process can serve all registered Sites.
wpsc runtime:serve --project /srv/wpsc --config runtime.config.js --host 127.0.0.1 --port 8787

# Build through the Scheduler, never directly through the Builder.
wpsc runtime:build --project /srv/wpsc --site company-a --config runtime.config.js

# Validate the project and inspect product state.
wpsc doctor --project /srv/wpsc
wpsc site inspect company-a --project /srv/wpsc --json
```

`wpsc platform:provision` intentionally generates systemd/Nginx artifacts but
does not execute `sudo`, `systemctl`, or Nginx reloads. The generated
`deploy/ACTIVATE_RUNTIME.md` contains the reviewed administrator commands.

## Site Layout

```text
config/
  runtime.env                 Private Runtime environment; never commit it
  runtime-sites.json          Hostname -> Site mapping
runtime.config.js             Shared Runtime composition and source adapters
sites/
  <site-id>/
    config/                   Site metadata, source, webhook, credentials, build state
    public/
      index.php               Site front controller
      dist/                   Generated static website
    storage/                  Site-private runtime data
deploy/                       Generated systemd, Nginx, and activation artifacts
framework/src/                Framework source
themes/                       Shared storefront theme
```

## Browser Setup

Opening an unconfigured Site domain serves the Installer. The Runtime Control
UI has a dedicated stylesheet, Light/Dark preference, field validation, and
friendly notices. Backend diagnostics remain structured (`code`, `message`,
`severity`); the browser presents actionable language without exposing raw
transport errors to ordinary users.

The setup order is fixed:

```text
Registration -> Webhook -> Ready decision -> First build
```

Browser and CLI are gateways. They do not bypass the Scheduler, Queue,
Dispatcher, Build Engine, or Output Pipeline.

## Development

```bash
npm test
node framework/src/cli/index.js --help
node framework/src/cli/index.js doctor --project .
```

Focused Runtime tests:

```bash
node --test test/runtimeBrowserViews.test.js test/runtimeRouter.test.js
node --test test/runtimePlatformProvisioning.test.js test/webhookRegistrationController.test.js
```

## Security Notes

- Keep `config/runtime.env` private and owned by the Runtime service account.
- Do not commit Application Passwords, WooCommerce keys, webhook secrets, or
  auth bridge secrets.
- Use HTTPS for production domains and webhook callback URLs.
- Nginx must deny direct web access to Site `config/` and `storage/` paths.
- Do not use `wpsc deploy rsync` as the production deployment authority; use
  immutable deployment artifacts and deployment orchestration for production.

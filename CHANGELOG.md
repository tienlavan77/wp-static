# Changelog

All notable WPSC changes are recorded here. The project uses an architecture-
first development model: a feature is complete only when its ownership,
contracts, tests, and operating boundary agree.

## Unreleased

### Shared Runtime Platform

- Added `wpsc platform:provision` to generate a reusable Runtime configuration,
  private environment template, systemd unit, Site Nginx virtual host, and
  activation instructions.
- Kept privileged activation outside the Node/Browser boundary: WPSC generates
  reviewed artifacts but never executes `sudo`, `systemctl`, or Nginx reloads.
- Added a Site-specific webhook callback resolver so one shared Runtime can
  register callbacks for multiple Site domains without routing every callback
  through the first Site domain.

### Runtime Control UI

- Redesigned Installer and Dashboard as a dedicated Runtime Control UI.
- Added a separately compiled Tailwind stylesheet served before any Site build.
- Added Light/Dark theme preference with a manual toggle and local persistence.
- Replaced raw JSON status output with success, warning, error, and info notices.
- Added immediate field validation for Site setup, WordPress connection, and
  optional WooCommerce credential pairs.
- Preserved the existing Runtime HTTP endpoints and stable backend diagnostics
  contract while improving user-facing presentation.

## 1.0.0

- Froze the public plugin, theme, adapter, and product package contracts.
- Delivered Site provisioning, Setup, WordPress/WooCommerce source integration,
  webhook registration, first build, static output, Runtime commerce APIs,
  Scheduler, Queue, Dispatcher, operations, backup, deployment, and release
  package foundations.
- Added Builder V1 capability integration for route templates, assets, SEO,
  manifests, search, cache metadata, fragments, and incremental build planning.
- Added production-oriented deployment artifacts, secret boundary services,
  product diagnostics/support bundles, migration scaffolding, and installation
  validation.
- Established the WPSC Architecture v2 ownership model and project layout.

## 0.1.0

- Initialized the original WPSC static build prototype with immutable Content,
  routing, rendering, output, project configuration, CLI, and test foundations.

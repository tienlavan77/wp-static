# WPSC Sprint 6 - Self-contained Production Release Roadmap

## Status

Planned.

## Roadmap Authority

The active Sprint 6 roadmap is now the enhanced roadmap reviewed by the project owner:

```text
outputs/WPSC_Sprint_6_Enhanced_Roadmap.md
```

This document remains the expanded implementation notes. If a conflict exists, the enhanced roadmap wins.

## Background

Sprint 5 created the release foundation:

- release folder structure
- HTTP installer primitives
- persistent config primitives
- install lock
- recovery
- release validation
- deployment guide

However, the current release package is not yet a living production installer.

Current limitation:

```text
Release package can be uploaded
but it cannot fully install itself
and cannot rebuild itself after source changes.
```

Sprint 6 turns release from a static shell into a self-contained production package.

## Final Product Goal

The desired production flow:

```text
Upload release to VPS
-> Point domain to release
-> Open domain for the first time
-> Setup UI appears automatically
-> Enter WP/Woo/API/secrets/admin credentials
-> Release writes its own config
-> Release switches from mock/demo to real source
-> Release fetches real data
-> Release builds static public output
-> Release starts webhook rebuild support
-> Release locks installer
-> Website runs as a real static site
```

## Key UX Rule

The user must not be required to add special virtual host routes.

Forbidden requirement:

```text
User must manually add location /install
User must manually add location /setup
User must manually add location /webhook
```

Allowed requirement:

```text
Point domain root to release public/front controller.
```

The first visit must work from:

```text
/
```

Optionally, the setup app can internally switch to:

```text
/setup
```

But this must be handled by the release front controller or SPA fallback, not by a custom Nginx route.

## Target Release Layout

```text
release/
├── config/
│   ├── .env
│   ├── project.json
│   ├── runtime.json
│   └── install.lock
├── installer/
│   ├── public/
│   ├── server.js
│   └── setup-app assets
├── plugins/
├── public/
│   ├── index.php
│   └── generated static site
├── storage/
│   ├── cache/
│   ├── logs/
│   └── reports/
├── themes/
├── vendor/
│   └── wpsc/
├── package.json
└── release-manifest.json
```

## Front Controller Rule

The release must include a default entry:

```text
release/public/index.php
```

or another equivalent front controller.

It checks:

```text
config/install.lock exists?
```

If no lock exists:

```text
render setup UI
```

If lock exists:

```text
serve generated static website
```

This allows a minimal Nginx config:

```nginx
root /home/data/sites/statictsp/public;
index index.php index.html;

location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

## Release Kernel Refactor Guardrails

The initial `public/index.php` may stay thin during early Sprint 6 commits, but it must not grow into a large procedural controller.

Before Commit 006-008 add build, verification, install lock finalization, health, maintenance, or webhook behavior, split release request handling into explicit runtime pieces:

```text
public/index.php
-> ReleaseKernel
-> InstallerDetector
-> StaticDispatcher
-> Response
```

Static file serving must also be isolated before adding cache or delivery features:

```text
StaticDispatcher
-> StaticFileResponder
```

`StaticFileResponder` is the future owner for:

- `readfile()` usage
- content type
- cache headers
- security headers
- gzip or precompressed output
- ETag or conditional responses

`installer/setup.php` must remain a view only.

Allowed:

- render setup shell
- render setup form
- load static setup assets

Forbidden:

- handle POST logic
- validate credentials
- write config files
- run build
- create install lock
- process webhook

All setup actions must go through installer API/service code shared with the future Production CLI.

## Setup Inputs

The setup UI must collect:

- Site name
- Site domain
- WordPress API URL
- WooCommerce API URL
- WooCommerce Consumer Key
- WooCommerce Consumer Secret
- WordPress admin username or application username
- WordPress application password
- Session secret
- Auth bridge secret
- Webhook secret
- Optional runtime port

## Config Outputs

After setup submit, release writes:

```text
release/config/.env
release/config/project.json
release/config/runtime.json
release/storage/reports/install-report.md
release/config/install.lock
```

Secrets must not be written to:

```text
release/public/
```

## Install Execution Flow

```text
Submit setup
-> Validate input
-> Write config/.env
-> Write project/runtime config
-> Verify WP API
-> Verify WooCommerce API with CK/CS
-> Fetch real content
-> Build static site
-> Write generated site to public
-> Register/store webhook settings
-> Create install.lock
-> Return success
```

## Webhook Rebuild Flow

After install, source changes should rebuild static files automatically.

```text
WP/Woo content changes
-> WordPress plugin sends webhook
-> release receives webhook
-> validates webhook secret
-> fetches changed source data
-> plans affected routes
-> rebuilds only related static files when possible
-> writes output to release/public
-> writes rebuild log/report
```

Webhook URL should be supported without special vhost route:

```text
/webhook/rebuild
```

The front controller or release server handles this internally.

## Architecture Principle

Sprint 6 must not move business logic into the theme.

Subsystem ownership:

| Area | Owner |
| --- | --- |
| Setup UI | Installer |
| Secret storage | Release config |
| Data fetching | Adapter layer |
| Build execution | Build engine |
| Static output | Compiler/build engine |
| Webhook routing | Release runtime |
| Theme rendering | Theme system |

## Commit Plan

### Commit 001 - Sprint 6 Specification

Create Sprint 6 documentation and freeze the product definition for self-contained release.

Deliverables:

- roadmap
- release flow
- zero custom vhost route rule
- success criteria

### Commit 002 - Release Front Controller

Add release front controller support.

Deliverables:

- `public/index.php`
- install lock detection
- setup fallback
- static route fallback

### Commit 003 - Setup UI Inputs

Expand setup UI fields.

Deliverables:

- Woo CK/CS fields
- WP application credentials
- secrets fields
- validation messages

### Commit 004 - Release Config Writer

Write release-local config.

Deliverables:

- `config/.env`
- `config/project.json`
- `config/runtime.json`
- safe secret handling

### Commit 005 - Vendor Bundle

Make release self-contained enough to build.

Deliverables:

- `vendor/wpsc/`
- package metadata
- runtime/build entrypoints
- minimal dependency rules

### Commit 006 - Real Source Verification

Verify WordPress and WooCommerce credentials before build.

Deliverables:

- WP API check
- Woo API check
- clear errors for 401/403/timeout

### Commit 007 - Release Build Executor

Build static output inside release.

Deliverables:

- fetch real data
- build public output
- replace setup placeholder with real site
- write install report

### Commit 008 - Installer Lock Finalization

Lock installer only after successful build.

Deliverables:

- `install.lock`
- already-installed behavior
- failed install recovery state

### Commit 009 - Webhook Rebuild Runner

Add production rebuild support.

Deliverables:

- `/webhook/rebuild`
- webhook secret validation
- rebuild queue
- route-aware rebuild when possible

### Commit 010 - Production CLI

Add a production CLI inside the release package.

Deliverables:

- `release/bin/wpsc`
- `wpsc verify`
- `wpsc setup`
- `wpsc install`
- `wpsc build`
- `wpsc rebuild`
- `wpsc health`
- `wpsc logs`
- `wpsc repair`
- `wpsc unlock`
- `wpsc version`
- shared service layer between Browser Wizard and CLI

### Commit 011 - Release Validation Upgrade

Validate self-contained release readiness.

Deliverables:

- vendor check
- setup/front-controller check
- config security check
- webhook check
- production CLI check

### Commit 012 - Final Docs and Review

Close Sprint 6.

Deliverables:

- final review
- Browser Installation Guide
- CLI Installation Guide
- Headless Deployment Guide
- DevOps Guide
- troubleshooting guide

## Success Criteria

Sprint 6 is done only when:

- A user uploads release to VPS.
- A user points domain root to release public/front controller.
- First visit shows setup automatically.
- User enters source and secret information.
- Release writes config safely.
- Release fetches real WP/Woo data.
- Release builds static site into public.
- Refreshing `/` shows the real website.
- Setup is locked after successful install.
- WP/Woo changes can trigger rebuild through webhook.
- No custom `/install`, `/setup`, or `/webhook` vhost route is required.

## Non-goals

Sprint 6 does not include:

- cloud dashboard
- marketplace
- visual builder redesign
- multi-tenant hosting
- one-click hosting provider integration

## Decision

Sprint 6 should start before further UI polishing.

Reason:

```text
Without self-contained install/build/rebuild,
the release package is only a static shell,
not a deployable product.
```

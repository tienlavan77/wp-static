# WPSC Architecture v2 - Sprint 6 Alignment

## Status

Accepted for implementation.

## Purpose

This document aligns the current Sprint 6 work with `WPSC-Architecture-v2.md`.

Architecture v2 changes WPSC from a single-site release package direction into a workspace platform:

```text
One Framework
Multiple Sites
Complete Isolation
```

## Authority

If a conflict exists between older Sprint 6 release-package notes and Architecture v2, Architecture v2 wins.

Older Sprint 6 work remains useful, but it must be reinterpreted through the workspace model.

## Key Change

Before Architecture v2, Sprint 6 focused on:

```text
self-contained release package
```

After Architecture v2, Sprint 6 focuses on:

```text
Site Initialization & Provisioning
```

## New Sprint 6 Scope

Sprint 6 should implement the foundation for:

- Site metadata
- Site lifecycle state
- Shared setup service
- Browser setup using shared service
- CLI setup using shared service
- Source plugin discovery
- Source registration
- Webhook gateway
- First build trigger

## Deferred From Old Sprint 6

The following older release-package items should not drive the next implementation commits until workspace/site boundaries are in place:

- single release-local installer as the primary architecture
- per-release webhook server
- release package as the only production unit
- writing generated site directly to `public/`

These ideas may return later as deployment targets, but they are not the core architecture.

## Workspace Structure Target

```text
wp-static/
├── framework/
├── cli/
├── dashboard/
├── setup/
├── themes/
├── plugins/
├── sources/
├── storage/
└── sites/
```

## First Site Target

```text
sites/tinsinhphat/
├── config/
│   └── site.json
├── storage/
│   ├── cache/
│   ├── logs/
│   ├── tmp/
│   └── sessions/
├── public/
│   └── dist/
├── themes/
└── plugins/
```

## Site State Model

The first state manager should support:

```text
CREATED
SETUP_REQUIRED
REGISTERING_SOURCE
READY
BUILDING
RUNNING
ERROR
DISABLED
```

## Build Output Rule

Builder must write generated output into:

```text
site/public/dist/
```

Builder must not overwrite:

```text
site/public/
```

This protects manually managed public assets such as:

- `robots.txt`
- `favicon.ico`
- verification files
- manually uploaded public assets

## Migration Strategy

Do not move the whole repository at once.

Use an incremental migration:

1. Add Architecture v2 documentation.
2. Add workspace skeleton.
3. Add first site metadata.
4. Add lifecycle state manager.
5. Add legacy-to-v2 mapping.
6. Start new Sprint 6 implementation from setup/source/webhook foundations.

## Implementation Rule

All new code after this point should prefer Architecture v2 ownership:

| Concern | Owner |
| --- | --- |
| Framework core | `framework/` or existing `src/` until migrated |
| CLI | `cli/` or existing `src/cli/` until migrated |
| Setup | `setup/` or existing `src/installer/` until migrated |
| Shared themes | `themes/` |
| Shared plugins | `plugins/` |
| Source adapters | `sources/` or existing `src/adapters/` until migrated |
| Site config/runtime | `sites/<site>/` |

## Decision

Continue from Architecture v2.

The next implementation commit should create the workspace skeleton without moving large legacy code yet.

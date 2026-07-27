# WPSC Architecture v2 - Legacy Migration Map

## Status

Draft for incremental migration.

## Purpose

This document maps the current WPSC repository to the Architecture v2 workspace structure.

The goal is to migrate safely without breaking the working storefront, runtime, build, or release code.

## Migration Rule

Do not move large subsystems until their new owner and tests are clear.

Architecture v2 should be adopted in this order:

1. New folders and new code follow Architecture v2.
2. Existing code remains stable.
3. Legacy code is moved only when a focused migration commit can verify behavior.

## Current To Target Map

| Current Location | Architecture v2 Target | Notes |
| --- | --- | --- |
| `src/` | `framework/` | Keep current source stable until framework package extraction is planned. |
| `src/cli/` | `cli/` | CLI should eventually become workspace CLI. |
| `src/installer/` | `setup/` | Installer logic should become shared setup service. |
| `src/adapters/` | `sources/` | Source adapters should be shared workspace adapters. |
| `src/plugins/` | `plugins/` | Shared plugin system stays workspace-owned. |
| `src/theme/` | `themes/` | Shared theme loading/resolution should move behind workspace themes. |
| `examples/basic-shop/` | `sites/tinsinhphat/` | Current real working site should be migrated gradually. |
| `examples/basic-shop/dist/` | `sites/tinsinhphat/public/dist/` | Build output target under Architecture v2. |
| `examples/basic-shop/theme/` | `sites/tinsinhphat/themes/` or `themes/` | Decide per reusable/private theme boundary. |
| `examples/basic-shop/runtime/` | `framework/runtime` or site runtime config | Runtime services need boundary review before moving. |
| `integrations/wordpress/` | `sources/wordpress/plugin` or `plugins/wordpress-source` | WordPress plugin integration belongs to source registration flow. |
| `release/` | deployment artifact | Release should become output of workspace/site build, not the source of truth. |
| `outputs/` | project documentation | Keep as audit/history documentation. |
| `docs/` | product documentation | Keep formal docs here. |
| `test/` | test suite | Keep until package-level test split is needed. |

## Migration Sequence

### Step 1 - Foundation

- Add Architecture v2 docs.
- Add workspace skeleton.
- Add first site metadata.
- Add site state manager.

### Step 2 - Site Repository

- Add read/write service for `sites/<site>/config/site.json`.
- Enforce site path isolation.
- Prevent cross-site reads/writes by default.

### Step 3 - Setup Service

- Extract shared setup service from current installer primitives.
- Browser Wizard and CLI must use the same service.
- No per-site installer logic.

### Step 4 - Source Registration

- Add plugin discovery.
- Add framework-owned UUID/secret/webhook generation.
- Add registration, test, and disconnect services.

### Step 5 - Build Target Migration

- Teach build engine to output to `sites/<site>/public/dist`.
- Keep `public/` user-managed.
- Preserve current example build until replacement is verified.

### Step 6 - Webhook Gateway

- Add workspace webhook gateway.
- Route by site UUID.
- Push work to queue.
- Do not build directly inside webhook request.

## Do Not Move Yet

Do not move these until tests and replacement paths are ready:

- `examples/basic-shop/`
- `src/runtime/`
- `src/builder/`
- `src/renderer/`
- `src/router/`
- `src/release/`

These are still active and connected to the current working storefront.

## Decision

Use Architecture v2 for all new Site/Workspace code.

Migrate legacy code incrementally after each boundary has tests.

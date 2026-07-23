# WPSC v1 Architecture Review

Status: `SPRINT 0 FREEZE CANDIDATE`

This document is the final Sprint 0 architecture review before WPSC moves into
v1 product development and real-domain deployment.

It reviews:

- coupling
- dependency direction
- naming
- public API
- internal API
- freeze readiness

## Inputs Reviewed

```text
docs/architecture-boundary.md
docs/public-contracts.md
docs/adr/001-normalized-content.md
docs/adr/002-runtime-boundary.md
docs/adr/003-theme-contract.md
docs/adr/004-incremental-build.md
docs/adr/005-plugin-system.md
docs/public-api-draft.md
docs/v1-adapter-api.md
docs/v1-theme-api.md
docs/v1-plugin-api.md
docs/runtime-commerce-api.md
docs/theme-system.md
```

## Review Summary

WPSC v1 has a coherent static-commerce architecture:

```text
Adapter Layer
-> Compiler
-> Build Engine
-> Static Output

Runtime Kernel
-> Dynamic customer workflows

Theme System
-> Static rendering from public context

Plugin System
-> Declared extension hooks
```

The architecture is ready to freeze for v1.x if future development respects the
public contracts and treats internal paths as replaceable implementation.

## Coupling Review

| Area | Review | Decision |
| --- | --- | --- |
| Adapter to Compiler | Acceptable. Adapter returns normalized data and collections. | Freeze. |
| Compiler to Build Engine | Acceptable. Compiler returns `sitePlan`; Build Engine writes artifacts. | Freeze. |
| Theme to Source | Must remain forbidden. Themes use `content`, `graph`, `route`, `site`, and `theme`. | Freeze boundary. |
| Runtime to Static Output | Runtime may enhance static pages but must not become public route renderer. | Freeze boundary. |
| Plugin to Core | Plugins must use hooks/context, not private imports. | Freeze boundary. |
| Build Engine to Source | Build Engine must not know raw WordPress/WooCommerce schema. | Freeze boundary. |

## Dependency Review

Allowed:

```text
Compiler -> Adapter contract
Build Engine -> sitePlan
Theme -> layout context
Runtime -> server-side service wrappers
Plugins -> declared hook context
```

Forbidden:

```text
Theme -> source adapter implementation
Runtime frontend -> source credentials
Adapter -> builder implementation
Builder -> raw WordPress/WooCommerce schema
Plugin -> private internal module as public API
```

Compatibility bridges are allowed during v1 freeze, but new documentation and
new integrations should prefer the new subsystem names:

```text
graph/
planner/
queue/
watcher/
progress/
invalidate/
```

## Naming Review

| Name | Status | Notes |
| --- | --- | --- |
| `Adapter Layer` | Stable | Source integration boundary. |
| `Compiler` | Stable | Produces `sitePlan`. |
| `Build Engine` | Stable | Writes artifacts and owns incremental build support. |
| `Runtime Kernel` | Stable | Dynamic customer workflows only. |
| `Theme System` | Stable | Static render contract. |
| `Plugin System` | Stable | Hook-based extension. |
| `graph` | Stable | Content and route dependency graph concepts. |
| `planner` | Stable | Changed item and affected route planning. |
| `queue` | Stable | Serialized rebuild work. |
| `invalidate` | Stable | Fresh build/cache invalidation policy. |
| `progress` | Stable | Build progress event formatting. |
| `watcher` | Stable | Dev file watching. |

## Public API Review

Public integration should use:

```text
src/index.js root exports
docs/public-contracts.md
docs/v1-adapter-api.md
docs/v1-theme-api.md
docs/v1-plugin-api.md
docs/runtime-commerce-api.md
```

The following public areas are accepted for v1:

- Adapter factories.
- `compile()`.
- `buildSite()`.
- Route/render helpers.
- Theme API constants.
- Plugin API constants.
- Runtime server/runtime/service helpers.
- Incremental planning helpers.
- Webhook receiver/server helpers.

Any API not documented in public contract docs should be treated as internal
even when exported for current implementation convenience.

## Internal API Review

Internal modules may be refactored during v1.x if the public contracts remain
stable.

Internal implementation areas include:

```text
src/adapters/* implementation files
src/builder/* implementation files
src/cache/* implementation files
src/core/* implementation files except documented root exports
src/runtime/* implementation files except documented runtime helpers/endpoints
src/theme/* implementation files
src/templates/* implementation files
src/visual-builder/* implementation files until builder contract freeze
```

Compatibility bridge files are intentionally temporary internal helpers.

## Freeze Checklist

- [x] Architecture boundary documented.
- [x] Owner/Input/Output/Public API/Forbidden matrix documented.
- [x] Allowed/Forbidden dependency matrix documented.
- [x] Public contracts documented.
- [x] ADRs created for core v1 decisions.
- [x] Runtime security boundary documented.
- [x] Theme contract documented.
- [x] Plugin contract documented.
- [x] Incremental build decision documented.
- [x] Compatibility bridge policy documented.
- [ ] Automated package-boundary tests fully aligned with new v1 folders.
- [ ] Public export audit completed against `docs/public-contracts.md`.
- [ ] Production deploy checklist completed for real domain.

## Residual Risks

1. Some package-boundary tests still reflect older examples and need alignment
   with the current Tin Sinh Phat project and v1 folder split.
2. Some implementation files remain dirty from product development work outside
   Sprint 0 and should be reviewed separately before final release tagging.
3. Builder/user-theme contracts are documented as direction but are not fully
   frozen as a public v1 builder product contract.
4. Runtime must be deployed with real HTTPS, secure cookies, CSRF protection,
   and rotated secrets before production traffic.

## Freeze Decision

Sprint 0 architecture is approved as a v1.x foundation.

Core architecture changes after this point should require:

1. an ADR update or new ADR,
2. public contract impact review,
3. package-boundary review,
4. migration note if existing users or project themes are affected.


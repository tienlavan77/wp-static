# ADR 005 - Plugin System

Status: `Accepted for WPSC v1`

## Decision

WPSC v1 plugins extend the framework through declared hooks and stable hook
context. Plugins may transform public data, routes, rendered HTML, or observe
build lifecycle events.

Plugins must not treat private Core module paths as stable public API.

## Context

WPSC needs extension points for source transforms, route changes, render
adjustments, build lifecycle work, builder workflow integration, and future
site-specific behavior.

Without a plugin contract, project-specific behavior would either be patched
into Core or implemented by importing internals. Both approaches make v1 hard
to maintain.

## Alternatives Considered

### No plugin system in v1

Rejected because real sites need extension points and source/theme/build
customization.

### Allow plugins to patch private internals

Rejected because it makes architecture freeze meaningless. Internal refactors
would become breaking changes.

### Freeze declared hooks and context

Accepted because it provides extension while preserving Core ownership and
public contracts.

## Consequences

- Plugins can extend WPSC without changing Core.
- Hook names and basic context shape are part of the v1 public contract.
- Plugins can be reviewed against boundary rules.
- Additional hook context fields may be added in v1.x if backward compatible.
- Dangerous extensions must be rejected when they bypass source/runtime
  credential boundaries.

## Links

- `docs/architecture-boundary.md`
- `docs/public-contracts.md`
- `docs/plugin-system.md`
- `docs/v1-plugin-api.md`


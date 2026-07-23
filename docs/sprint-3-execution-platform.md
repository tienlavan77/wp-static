# WPSC Sprint 3 - Runtime Execution Platform

**Version:** 1.0  
**Status:** Completed  
**Prerequisite:** Sprint 2 Developer Workflow Completed

## Theme

Sprint 3 turns the existing runtime work into a reusable execution platform.

Sprint 0 froze the architecture. Sprint 1 made installation usable. Sprint 2 made builds predictable. Sprint 3 focuses on the runtime foundation that CLI, Web Installer, plugins, and future interfaces can share.

## Sprint Goal

By the end of Sprint 3, WPSC should have a stable runtime execution layer that can:

- Carry shared runtime context.
- Resolve services consistently.
- Run hooks without changing core logic.
- Load extensions through a defined contract.
- Expose diagnostics for runtime behavior.

## Architecture Constraints

Sprint 3 must respect the Sprint 0 architecture freeze:

- Do not change Adapter Contract.
- Do not change Compiler Contract.
- Do not change Theme Contract.
- Do not move business logic into Runtime Kernel.
- Do not make CLI, Web Installer, or plugins depend on each other.

Runtime may provide shared execution primitives, but feature-specific logic must remain in the proper subsystem.

## Core Principle

```text
Core Engine first
Interface second
```

The execution platform must be usable by:

- CLI
- Install Wizard
- Web Installer
- Runtime server
- Plugins
- Future admin interfaces

## Expected Commit Plan

### Commit 001

Runtime Context

### Commit 002

Service Container

### Commit 003

Hook System

### Commit 004

Plugin SDK Foundation

### Commit 005

Extension Loader

### Commit 006

Runtime Configuration

### Commit 007

Runtime Diagnostics

### Commit 008

Sprint Documentation and Final Review

## Non-Goals

Sprint 3 does not include:

- Visual Builder UI
- Theme Marketplace
- Plugin Marketplace
- Cloud Dashboard
- New commerce features
- New WordPress adapter behavior

## Definition of Done

Sprint 3 is complete when:

- Runtime context is available.
- Services can be resolved without hidden globals.
- Hooks can be registered and executed predictably.
- Plugins have a minimal SDK entry point.
- Extensions can be loaded through a stable path.
- Runtime configuration can be validated.
- Runtime diagnostics can explain common runtime issues.
- Documentation explains how these pieces fit together.

## Completed Execution Platform

Sprint 3 produced the following runtime primitives:

| Primitive | Owner | Purpose |
| --- | --- | --- |
| Runtime Context | Runtime Kernel | Carries paths, environment, logger, services, request, diagnostics, and runtime version. |
| Service Container | Runtime Kernel | Registers, resolves, lists, and disposes runtime services. |
| Hook System | Runtime Kernel | Runs action hooks and filter hooks with Runtime Context. |
| Plugin SDK | Runtime Kernel | Provides the controlled plugin-facing API. |
| Extension Loader | Runtime Kernel | Loads plugin descriptors and setup functions through Plugin SDK. |
| Runtime Configuration | Runtime Kernel | Normalizes and validates runtime-facing configuration. |
| Runtime Diagnostics | Runtime Kernel | Produces read-only runtime reports from public primitive metadata. |

## Execution Flow

```text
Runtime Configuration
-> Runtime Context
-> Service Container
-> Hook System
-> Plugin SDK
-> Extension Loader
-> Runtime Diagnostics
```

Interfaces such as CLI, Install Wizard, Web Installer, Runtime Server, and future admin tools should consume this execution platform. They should not create independent runtime implementations.

## Boundary Rules

- Runtime Context does not register or resolve dependencies by itself.
- Service Container does not instantiate interface-specific services by itself.
- Hook System does not create services.
- Plugin SDK is the only plugin-facing API.
- Extension Loader does not read plugin files from disk in this sprint.
- Runtime Configuration validates objects; file loading remains caller-owned.
- Runtime Diagnostics is read-only and must not mutate runtime primitives.

## Final Review

Sprint 3 meets the objective of turning runtime work into a reusable execution platform.

All commits were implemented without changing Sprint 0 public contracts:

- Adapter Contract unchanged.
- Compiler Contract unchanged.
- Theme Contract unchanged.
- Runtime primitives remain runtime-owned.
- CLI and future Web Installer can consume the same platform.
- Plugin execution now has a stable foundation without marketplace concerns.

## Follow-Up Candidates

Future sprints may build on Sprint 3 with:

- Web Installer UI over the same Runtime Configuration and Diagnostics primitives.
- Runtime config file loading wrapper.
- Plugin capability checks.
- Service scopes.
- Runtime snapshots with secret redaction.
- Diagnostics serialization for support bundles.

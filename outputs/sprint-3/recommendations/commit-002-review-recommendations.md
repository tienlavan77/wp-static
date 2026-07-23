# Sprint 3 - Commit 002 Recommendations

## Service Container

**Sprint:** Sprint 3  
**Commit:** 002  
**Subject:** Service Container  
**Status:** Non-blocking Recommendations

## Overview

Commit 002 introduces the Service Container as the dependency management layer of the Execution Platform.

The implementation separates service ownership from Runtime Context and preserves the architecture boundaries established in Sprint 0.

No blocking architectural issues were identified.

## 1. Introduce Scoped Services

Future versions should add scoped service lifetimes such as:

- Build Session
- Installation Session
- Request Session
- CLI Invocation

This allows controlled lifetimes without turning everything into a global singleton.

## 2. Add Service Tags

Service tags should remain optional metadata.

Possible uses:

- diagnostics
- plugin discovery
- runtime inspection
- future dashboards

Tags should not affect dependency resolution.

## 3. Validate Service Descriptors

Registration should eventually follow:

```text
Descriptor
-> Validation
-> Registration
```

Validation should cover:

- unique identifier
- valid lifetime
- factory correctness
- dependency metadata

## 4. Circular Dependency Detection

Future versions should detect dependency cycles and report useful diagnostics.

Example:

```text
Service A
-> Service B
-> Service A
```

## 5. Container Snapshot Support

Future snapshots may include:

- registered services
- singleton instances
- service lifetimes
- dependency graph

Snapshots should be read-only and intended for debugging.

## 6. Runtime Metrics Integration

Runtime Diagnostics should eventually consume metrics directly from Service Container.

Suggested metrics:

- registered services
- singleton count
- transient count
- scoped count
- initialization time
- disposal time

## 7. Explicit Disposal Lifecycle

The lifecycle should be documented as:

```text
Register
-> Resolve
-> Use
-> Dispose
```

Each disposable service should be disposed exactly once.

## 8. Preserve Runtime Context Simplicity

Runtime Context should expose only a reference to the Service Container.

It should not:

- resolve dependencies
- register services
- own service lifecycle

## 9. Prepare for Hook System

Commit 003 should execute hooks with Runtime Context and allow hooks to resolve services through `context.services`.

The Hook System should not instantiate services directly.

## 10. Prepare for the Web Installer

CLI and the future Web Installer should consume the same Execution Platform.

Expected flow:

```text
Browser
-> Installation Wizard
-> Runtime Context
-> Service Container
-> Execution Platform
-> Core Engine
```

## Final Assessment

Commit 002 is approved.

Recommended enhancements are non-blocking and should guide future diagnostics, dependency management, and extensibility work.

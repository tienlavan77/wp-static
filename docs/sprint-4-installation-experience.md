# WPSC Sprint 4 - Installation Experience

**Version:** 1.0  
**Status:** Completed  
**Prerequisite:** Sprint 3 Runtime Execution Platform Completed

## Overview

Sprint 4 moves WPSC from execution-platform foundation toward a complete browser-based product installation experience.

The user should be able to upload WPSC, point a domain to it, complete a browser installation wizard, and obtain a working website without touching the command line.

## Guiding Principle

```text
Execution Platform first
Installation Experience second
```

The installer is an interface over the Execution Platform. It does not become part of the Core Engine.

## Architecture

```text
Browser
-> Installation Wizard
-> Wizard API
-> Installation Session
-> Execution Platform
-> Core Engine
```

## Commit Plan

| Commit | Scope | Status |
| --- | --- | --- |
| 001 | Installation Session | Done |
| 002 | Wizard API | Done |
| 003 | Environment Validation | Done |
| 004 | Configuration Generator | Done |
| 005 | Build Orchestrator | Done |
| 006 | Installation Report | Done |
| 007 | Web Installer UI | Done |
| 008 | Sprint Documentation and Final Review | Done |

## Commit 001 - Installation Session

Installation Session owns:

- installation lifecycle
- state management
- progress tracking
- high-level execution orchestration

Lifecycle:

```text
START
-> CHECK
-> CONFIGURE
-> VALIDATE
-> BUILD
-> FINISH
```

Commit 001 does not include:

- UI
- browser code
- filesystem writing
- build execution
- environment probing

## Commit 002 - Wizard API

Wizard API owns the browser-facing contract.

Responsibilities:

- create installation sessions
- expose session state
- update install input
- expose progress
- expose diagnostics
- report structured action errors

Commit 002 does not include:

- HTTP routing
- browser UI
- environment probing
- filesystem writing
- build execution

## Commit 003 - Environment Validation

Environment Validation checks hosting readiness before configuration and build steps.

Responsibilities:

- validate Node.js compatibility
- validate PHP availability
- validate writable output directory
- validate SSL/domain readiness
- validate Runtime Configuration compatibility
- return structured diagnostics

Commit 003 does not include:

- browser UI
- filesystem config generation
- build execution
- WordPress API verification

## Commit 004 - Configuration Generator

Configuration Generator creates install configuration artifacts without writing them to disk.

Responsibilities:

- normalize installer input
- generate project config shape
- generate runtime config through Sprint 3 Runtime Configuration
- generate file candidates for future write step
- report placeholder warnings
- return structured diagnostics

Commit 004 does not include:

- filesystem writes
- browser UI
- build execution
- WordPress API verification

## Commit 005 - Build Orchestrator

Build Orchestrator coordinates the initial build through an injected build function.

Responsibilities:

- require the installation session to be validated
- move session progress into `BUILD`
- call the Build Platform through a provided function
- finish the session on success
- fail the session with structured diagnostics on build error

Commit 005 does not include:

- build implementation
- filesystem config writes
- browser UI
- report generation

## Commit 006 - Installation Report

Installation Report creates a support-ready Markdown summary.

Responsibilities:

- summarize session state
- summarize environment validation
- summarize generated configuration
- summarize runtime configuration
- summarize build result
- list generated file candidates
- include warnings and errors

Commit 006 does not include:

- filesystem writes
- browser UI
- report download endpoint

## Commit 007 - Web Installer UI

Web Installer UI creates a thin browser shell.

Responsibilities:

- display installation state
- display progress
- collect initial install input
- display diagnostics
- call Wizard API transport endpoint

Commit 007 does not include:

- runtime logic
- build logic
- environment validation logic
- filesystem writes
- server routing

## Boundary Rules

- Browser does not call Runtime primitives directly.
- Wizard API is the only browser-facing interface.
- Installation Session coordinates state, not business logic.
- Runtime Configuration remains the source of runtime config validation.
- Build Platform remains the owner of build execution.
- Runtime Diagnostics remains the owner of runtime diagnostic reporting.

## Completed Installation Platform

Sprint 4 produced the following installer primitives:

| Primitive | Owner | Purpose |
| --- | --- | --- |
| Installation Session | Installer Layer | Owns lifecycle, state, progress, diagnostics, and terminal states. |
| Wizard API | Installer Layer | Exposes browser-facing actions over Installation Session. |
| Environment Validation | Installer Layer | Produces structured hosting readiness diagnostics. |
| Configuration Generator | Installer Layer | Generates configuration objects and file candidates using Runtime Configuration. |
| Build Orchestrator | Installer Layer | Coordinates the first build through an injected Build Platform function. |
| Installation Report | Installer Layer | Formats a Markdown support/debug report. |
| Web Installer UI | Installer Presentation Layer | Provides a thin browser shell over Wizard API. |

## Installation Flow

```text
Browser
-> Web Installer UI
-> Wizard API
-> Installation Session
-> Environment Validation
-> Configuration Generator
-> Build Orchestrator
-> Installation Report
```

The flow consumes Sprint 3 Runtime Configuration and respects the Build Platform boundary.

## Explicit Non-Goals Preserved

Sprint 4 intentionally does not include:

- production HTTP server routing for the installer
- actual config file writes from the browser flow
- WordPress REST API verification
- WooCommerce REST API verification
- final deployment workflow
- authentication for installer access
- multi-tenant installer behavior

Those belong in later product hardening sprints.

## Final Review

Sprint 4 meets the installation-experience foundation goal.

The browser installation experience now has:

- lifecycle state
- public Wizard API contract
- environment diagnostics
- generated configuration candidates
- initial build orchestration
- Markdown installation report
- thin browser UI shell

The implementation remains layered over existing architecture and does not redesign Runtime Kernel, Core Engine, or Build Platform.

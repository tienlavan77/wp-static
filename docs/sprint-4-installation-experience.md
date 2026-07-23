# WPSC Sprint 4 - Installation Experience

**Version:** Draft 1.0  
**Status:** In Progress  
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
| 003 | Environment Validation | Pending |
| 004 | Configuration Generator | Pending |
| 005 | Build Orchestrator | Pending |
| 006 | Installation Report | Pending |
| 007 | Web Installer UI | Pending |
| 008 | Sprint Documentation and Final Review | Pending |

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

## Boundary Rules

- Browser does not call Runtime primitives directly.
- Wizard API is the only browser-facing interface.
- Installation Session coordinates state, not business logic.
- Runtime Configuration remains the source of runtime config validation.
- Build Platform remains the owner of build execution.
- Runtime Diagnostics remains the owner of runtime diagnostic reporting.

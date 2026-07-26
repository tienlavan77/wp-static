# WPSC Sprint 5 - Production Installer & Release Package

**Version:** 1.0 Roadmap  
**Status:** In Progress  
**Prerequisite:** Sprint 4 Installation Experience Completed

## Overview

Sprint 5 turns WPSC from an installation-capable framework into a production-ready product that can be packaged, distributed, deployed, and installed by end users.

Expected user flow:

```text
Build Release
-> release.zip
-> Upload to Hosting
-> Point Domain
-> Open /install
-> Complete Wizard
-> Website Ready
```

## Architecture Goal

Sprint 5 must not redesign the Installer.

It connects the Sprint 4 Installation Experience to production hosting:

```text
HTTP Installer
-> Wizard API
-> Installation Session
-> Environment Validation
-> Persistent Configuration
-> Build Orchestrator
-> Build Platform
-> Installation Report
```

## Hosting Modes

Sprint 5 must distinguish two deployment modes:

- `vps`: production server can run Node.js and execute the real build during installation.
- `shared-hosting`: package can be uploaded to PHP hosting, but build execution requires Node support or a prebuilt output workflow.

The product must not promise runtime build support on hosting that cannot execute Node.js.

## Commit Plan

| Commit | Scope | Status |
| --- | --- | --- |
| 001 | Release Package Structure | Done |
| 002 | HTTP Installer | Done |
| 003 | Persistent Configuration | Done |
| 004 | Production Build | Done |
| 005 | Installation Lock | Done |
| 006 | Release Builder CLI | Done |
| 007 | Deployment Guide | Pending |
| 008 | Installation Recovery | Pending |
| 009 | Release Validation | Pending |
| 010 | Documentation and Final Review | Pending |

## Commit 001 - Release Package Structure

Release package layout:

```text
release/
├── public/
├── themes/
├── plugins/
├── storage/
├── storage/cache/
├── storage/logs/
├── storage/reports/
├── config/
├── installer/
├── vendor/
└── index.php
```

Commit 001 creates the release structure definition only.

It does not:

- create a zip archive
- copy project source
- expose HTTP routes
- persist installation configuration
- run production builds

## Commit 002 - HTTP Installer

HTTP Installer exposes the browser installation flow through route handlers.

Routes:

```text
GET  /install
POST /install/start
POST /install/check
POST /install/config
POST /install/build
GET  /install/report
```

Responsibilities:

- serve Web Installer UI
- call Wizard API actions
- return structured HTTP-like responses
- keep transport separate from business logic

Commit 002 does not include:

- persistent configuration writes
- real environment check execution
- real production build execution
- installation lock enforcement
- PHP server adapter

## Commit 003 - Persistent Configuration

Persistent Configuration writes validated installation configuration to disk.

Generated files:

```text
config/project.json
config/runtime.json
config/install-state.json
```

Responsibilities:

- reject invalid generated configuration
- write JSON using atomic temp-file replacement
- keep persistent files under `config/`
- preserve immutable release package rules

Commit 003 does not include:

- creating `config/install.lock`
- enforcing lock checks
- running production builds
- wiring HTTP routes to persistence

## Commit 004 - Production Build

Production Build executes the real Build Platform from persisted installation configuration.

Responsibilities:

- read persisted `project.json` and `runtime.json`
- call an injected production build runner
- pass production build options
- return structured build summaries
- return structured failure diagnostics

Commit 004 does not include:

- implementing the Build Platform
- enforcing installation lock
- HTTP route wiring
- release zip creation

## Commit 005 - Installation Lock

Installation Lock prevents repeated browser installation after a production install has completed.

Generated file:

```text
config/install.lock
```

Responsibilities:

- read unlocked, locked, and corrupt lock states
- create lock files using atomic temp-file replacement
- treat corrupt lock files as installed for safety
- expose `assertNotInstalled()` for installer guards
- redirect `GET /install` to `GET /install/already-installed`
- return structured `409` responses for locked installer API calls

Commit 005 does not include:

- recovery or unlock workflow
- release zip creation
- deployment guide
- writing the lock automatically from the production build route

## Commit 006 - Release Builder CLI

Release Builder CLI creates a deployable release directory from a project.

Command:

```bash
wpsc release build --project <project-dir> --output-dir <release-dir>
```

Options:

- `--package-name <name>`
- `--mode vps|shared-hosting`
- `--clean`
- `--json`

Responsibilities:

- create the release package structure from Commit 001
- copy optional project `public/`, `themes/`, and `plugins/` directories
- generate `release-manifest.json`
- expose clear text and JSON CLI output

Commit 006 does not include:

- zip archive generation
- deployment guide
- release validation
- installation recovery

## Immutable Release Package

During installation WPSC may create:

- `config/runtime.json`
- `config/project.json`
- `config/install.lock`
- `storage/reports/install-report.md`
- public build output
- runtime metadata

During installation WPSC must not modify:

- themes
- plugins
- vendor framework source
- release assets

## Success Criteria

Sprint 5 is complete when:

- release packages can be generated automatically
- a production server can install WPSC through the browser
- runtime configuration is persisted safely
- production builds execute successfully where supported
- installation is protected against repeated execution
- documentation enables deployment without developer assistance

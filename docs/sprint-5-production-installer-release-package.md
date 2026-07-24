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
| 003 | Persistent Configuration | Pending |
| 004 | Production Build | Pending |
| 005 | Installation Lock | Pending |
| 006 | Release Builder CLI | Pending |
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

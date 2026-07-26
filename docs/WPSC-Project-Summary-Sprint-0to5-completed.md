# WPSC Project Summary (Sprint 0 → Sprint 5)

## Overview

WPSC is a layered static website framework.

## Sprint 0

-   Foundation
-   DI
-   Architecture

## Sprint 1

-   Runtime
-   Theme Loader
-   Plugin Loader

## Sprint 2

-   Build Platform
-   Renderer
-   Asset Pipeline
-   Build CLI

## Sprint 3

-   Installation Wizard
-   Environment Check
-   Configuration

## Sprint 4

-   Dashboard
-   Theme Manager
-   Plugin Manager
-   Settings
-   REST API

## Sprint 5

-   001 Release Package
-   002 HTTP Installer
-   003 Persistent Configuration
-   004 Production Build
-   005 Installation Lock
-   006 Release Builder CLI
-   007 Deployment Guide
-   008 Installation Recovery
-   009 Release Validation
-   010 Documentation & Final Review

## Release Flow

``` text
Develop -> Build -> Release -> Validate -> Deploy -> Install -> Lock -> Recover
```

## Current Status

-   Foundation: Complete
-   Runtime: Complete
-   Build Platform: Complete
-   Installation Experience: Complete
-   Web Dashboard: Complete
-   Release Workflow: Complete
-   Documentation: Ongoing

## Sprint 6

-   Self-contained Production Release
-   First-visit setup without custom virtual host routes
-   Browser-first and CLI-first installation
-   Release-local configuration and secrets
-   Real WP/Woo fetch and static build
-   Webhook rebuild runner
-   Production CLI in `release/bin/wpsc`

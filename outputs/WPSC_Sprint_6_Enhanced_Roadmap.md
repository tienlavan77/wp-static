# WPSC Sprint 6 -- Enhanced Roadmap

## Assessment

The current Sprint 6 roadmap is solid and should be extended with a
Production CLI for DevOps.

## Key Recommendation

Every Release Package should include:

``` text
release/
├── bin/
│   └── wpsc
├── public/
├── installer/
├── config/
├── storage/
└── vendor/
```

Browser Wizard and CLI must share the same Service Layer.

## New Commit 010

**Production CLI**

Commands:

-   wpsc verify
-   wpsc setup
-   wpsc install
-   wpsc build
-   wpsc rebuild
-   wpsc health
-   wpsc logs
-   wpsc repair
-   wpsc unlock
-   wpsc version

## Commit 011

Release Validation must also validate the Production CLI.

## Commit 012

Documentation:

-   Browser Installation Guide
-   CLI Installation Guide
-   Headless Deployment Guide
-   DevOps Guide

## Deployment Flow

``` text
Upload -> wpsc verify -> wpsc setup -> wpsc build -> Lock -> Online
```

## Final Goal

Support both Browser-first and CLI-first deployment using the same
installation services.

## Release Front Controller Guardrails

`public/index.php` must remain a thin front controller.

Before Sprint 6 adds source verification, build execution, installer
locking, webhook rebuilds, health checks, preview, or maintenance behavior,
release request handling should move behind:

``` text
public/index.php
-> ReleaseKernel
-> InstallerDetector
-> StaticDispatcher
-> Response
```

Static file delivery should later move into `StaticFileResponder` so cache,
security headers, gzip, and ETag support do not expand the front controller.

`installer/setup.php` must remain a view only. It may render setup UI, but it
must not handle POST, validate credentials, write config, run build, create
locks, or process webhooks.

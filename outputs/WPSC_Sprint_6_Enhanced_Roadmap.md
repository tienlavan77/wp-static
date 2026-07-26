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

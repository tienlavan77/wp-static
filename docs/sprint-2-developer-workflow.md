# WPSC Sprint 2 - Developer Workflow & Build Experience

**Version:** 1.0  
**Status:** Ready for Development  
**Prerequisite:** Sprint 1 Product Foundation Completed

## Theme

Sprint 2 focuses on transforming WPSC from a framework that can be installed into a framework that developers enjoy using every day.

Sprint 1 established the Product Foundation.

Sprint 2 establishes the Development Foundation.

## Sprint Goal

By the end of Sprint 2, developers should be able to:

- Build projects with confidence.
- Detect build failures early.
- Understand build performance.
- Iterate quickly during development.
- Prepare production-ready output.

## Architecture Constraints

Sprint 2 must not modify:

- Architecture Boundary Map
- Public Contracts
- Compiler API
- Adapter API
- Theme API
- Runtime API
- Plugin API

Sprint 2 should extend existing systems instead of introducing new architectural layers.

## Core Deliverables

## 1. Build Pipeline

Introduce a standardized build workflow:

```text
Source
-> Validate
-> Compile
-> Optimize
-> Output
```

Goals:

- Predictable build.
- Clear build stages.
- Reusable pipeline.

## 2. Build Report

Generate a build report after successful builds.

Suggested content:

- Build duration
- Generated pages
- Generated assets
- Warnings
- Errors
- Output size
- Runtime usage
- Plugin summary

Output:

```text
build-report.md
```

Future:

```text
build-report.json
```

## 3. Incremental Build

Only rebuild modified resources.

Goals:

- Faster development.
- Lower CPU usage.
- Scalable projects.

## 4. Watch Mode

Introduce:

```bash
wpsc build --watch
```

Features:

- File watching.
- Automatic rebuild.
- Incremental compilation.

## 5. Build Progress

Improve CLI experience:

```text
Validate
OK
Compile
OK
Generate Pages
OK
Optimize Images
OK
Done
```

Developers should always understand the current build stage.

## 6. Asset Pipeline

Standardize asset processing:

- CSS
- JavaScript
- Images
- Fonts

Goals:

- Hashing.
- Minification.
- Optimization.

## 7. Build Performance Metrics

Collect metrics:

- Total duration.
- Compile duration.
- Page generation.
- Asset generation.
- Memory usage.

These metrics should feed the Build Report.

## 8. Error Reporting

Every build failure should include:

- Summary.
- Affected file.
- Suggested fix.
- Error code in the future.

## 9. Production Build

Introduce:

```bash
wpsc build --production
```

Production mode may include:

- Minification.
- Compression.
- Asset optimization.
- Runtime optimization.

## 10. Testing

Sprint 2 should include tests for:

- Build pipeline.
- Watch mode.
- Incremental build.
- Asset pipeline.
- Production build.

## Non Goals

Sprint 2 should not introduce:

- New runtime features.
- CMS features.
- Deployment platform.
- Plugin marketplace.
- Cloud services.

## Expected Commit Plan

```text
001 - Build Pipeline Foundation
002 - Build Report
003 - Incremental Build
004 - Watch Mode
005 - Asset Pipeline
006 - Production Build
007 - Performance Metrics
008 - Sprint Documentation & Final Review
```

## Success Criteria

Sprint 2 is complete when WPSC provides:

- Predictable build workflow.
- Incremental development.
- Build diagnostics.
- Build reporting.
- Production-ready output.
- High-quality CLI developer experience.

All of this must happen without violating Sprint 0 architecture.

## Review Focus

Each commit should be reviewed against:

- Architecture Compliance.
- Public Contract Stability.
- Developer Experience.
- Performance.
- Maintainability.
- Test Coverage.

Architecture stability has priority over feature quantity.

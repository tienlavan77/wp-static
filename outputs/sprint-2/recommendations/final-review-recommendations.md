# WPSC Sprint 2 - Final Recommendations

**Sprint:** Sprint 2  
**Status:** Post Audit Recommendations  
**Blocking:** No

## Summary

Sprint 2 successfully established the Developer Workflow foundation without violating Sprint 0 architecture constraints.

The recommendations below are follow-up improvements, not blockers.

## Pipeline

- Keep stable stage IDs such as `validate`, `compile`, `optimize`, and `output`.
- Standardize event names such as `stage:start`, `stage:finish`, and `stage:error`.
- Formalize the build context schema around project, environment, runtime, metrics, artifacts, warnings, and errors.
- Prepare graceful cancellation for longer watch/build sessions.

## Reports

- Add report schema versions.
- Treat Markdown as one renderer over a shared report model.
- Later support JSON and HTML reports.
- Unify Install, Validation, Build, Doctor, and Deployment report structures.

## Incremental Build

- Promote changed items from string tokens to structured objects.
- Record why each route is affected.
- Add a future `wpsc build --plan` preview command.

## Watch Mode

- Keep debounce and build queue behavior.
- Add watch session metrics later:
  - session duration
  - rebuild count
  - incremental rebuild count
  - skipped rebuild count

## Asset Pipeline

- Give each asset stable identity:
  - source
  - destination
  - type
  - hash
- Expand optimization statuses beyond planned/skipped/unknown.
- Add a future `asset-manifest.json` with path, type, size, and hash.

## Production Build

- Prepare for build modes:
  - development
  - production
  - preview
  - ci
- Move production policy into configuration later.
- Add future production validation checks.

## Performance Metrics

- Add metrics schema version.
- Store historical metrics for comparison.
- Add performance budgets for CI.
- Include output directory file count and size.

## Long-Term Principle

Core Engine first. Interfaces second.

The same core services should power:

- CLI
- Web Installer
- Future dashboards

No build, validation, planner, report, or production business logic should exist only inside an interface.

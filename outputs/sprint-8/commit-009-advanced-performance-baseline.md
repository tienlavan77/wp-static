# Sprint 8 Commit 009 - Advanced Website Performance Baseline

Status: PASS

## Delivered

- Versioned `wpsc.performance-baseline` contract.
- Site-scoped operation duration, count and error measurements.
- Runtime measurement for Commerce, Checkout, Forms, Search and general API.
- Observable cache hits, misses and hit rate.
- Build metrics for cache efficiency and incremental pages written.
- Existing pipeline stage duration, total build duration, memory and asset
  metrics remain available.
- Measurement wraps existing operations without changing their ownership or
  return contracts.

## Boundary

Performance instrumentation observes Service operations. It does not move
business logic, cache authority, provider access or Build ownership. Metrics
are isolated by Site and contain aggregate timings rather than credentials or
provider payloads.

## Validation

```bash
node --test test/advancedPerformance.test.js test/performanceCache.test.js test/buildMetrics.test.js test/commerceRuntime.test.js test/incrementalBuild.test.js test/buildPipeline.test.js test/siteCacheService.test.js test/formsService.test.js test/checkoutService.test.js
node --check framework/src/performance/createPerformanceService.js
git diff --check
```

Focused Runtime, Commerce, Forms, Checkout, Site Cache, Build Pipeline,
incremental build and Builder cache validation passed with 39 tests.

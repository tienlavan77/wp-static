# Sprint 10 Commit 026 - Phase 18 Performance Benchmark

Status: PASS

## Method

One isolated WordPress/WooCommerce Runtime fixture creates the following C023
build-history entries from the same Site dataset:

1. initial full build;
2. Product incremental build;
3. Page incremental build;
4. Taxonomy incremental build.

The test emits the actual telemetry record for each scenario: total duration,
source/build/publish phase durations, route count, pages written and total
pages. It asserts telemetry is complete and does not impose an artificial
performance threshold.

The final report must copy measured values from the green E2E output. A small
fixture may not demonstrate a material incremental speedup; that is valid
evidence and must be recorded honestly.

## Measured evidence

Fixture: 8 total pages. All values are milliseconds from C023 telemetry.

| Scenario | Mode | Duration | Source | Build | Publish | Changed routes | Pages written |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Full | full | 1331 | 13 | 1272 | 44 | 0 | 8 |
| Product | incremental | 3406 | 3 | 3286 | 115 | 3 | 3 |
| Page | incremental | 609 | 3 | 495 | 110 | 1 | 1 |
| Taxonomy | incremental | 4636 | 15 | 4342 | 276 | 2 | 2 |

Interpretation: Page incremental is faster for this fixture. Product and
Taxonomy incremental are slower than the measured full build, despite writing
fewer pages. This small fixture therefore proves correctness and telemetry,
not a general performance advantage. A representative larger Site dataset is
required before making an optimisation or commercial performance claim.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 18 records full and incremental Runtime benchmark evidence (10058.702818ms)
18 passed, 0 failed
```

# Sprint 2 / Commit 003 - Incremental Build

## Intent

Standardize incremental build planning so WPSC can map changed content, terms, and broad source changes to only the affected routes.

## Files Added

| File | Purpose |
| --- | --- |
| `src/graph/createRouteDependencyGraph.js` | Builds route dependency data and finds affected routes. |
| `src/planner/parseChangedItem.js` | Parses CLI change tokens such as `product:slug` and `term:taxonomy:slug`. |
| `src/planner/planIncrementalBuild.js` | Creates incremental build plans from changed items and route dependencies. |
| `outputs/sprint-2/commit-003-incremental-build.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-003-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/incremental/createRouteDependencyGraph.js` | Re-exports the graph module for backward compatibility. |
| `src/incremental/parseChangedItem.js` | Re-exports the planner parser for backward compatibility. |
| `src/incremental/planIncrementalBuild.js` | Re-exports the planner implementation for backward compatibility. |
| `test/incrementalBuild.test.js` | Uses local mock fixtures instead of real API data and verifies incremental planning/build behavior. |
| `outputs/sprint-2/README.md` | Marks Commit 003 as done. |

## Supported Changed Inputs

```text
product:demo-product
page:home
post:news-slug
term:product_cat:dien-thoai
product_cat:dien-thoai
tag:tag-slug
```

## Architecture Notes

- No public contract changes.
- `src/incremental/*` remains compatible through re-exports.
- New route dependency logic lives under the existing graph/planner areas.
- Tests avoid live WordPress/WooCommerce APIs.

## Verification

```bash
node --test test/incrementalBuild.test.js
node --check src/graph/createRouteDependencyGraph.js
node --check src/planner/parseChangedItem.js
node --check src/planner/planIncrementalBuild.js
node --check test/incrementalBuild.test.js
```

Result:

```text
5 incremental tests passed.
Syntax checks passed.
```

## Follow-up

- Watch Mode can emit changed item tokens into the planner.
- Build Report can include incremental plan details.

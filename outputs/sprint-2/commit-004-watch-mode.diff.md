# Sprint 2 / Commit 004 - Watch Mode

## Intent

Add `wpsc build --watch` so developers can rebuild automatically while editing source files without starting the static dev server.

## Files Added

| File | Purpose |
| --- | --- |
| `src/dev-server/watchBuildProject.js` | Performs initial build, watches project paths, and rebuilds on changes. |
| `outputs/sprint-2/commit-004-watch-mode.diff.md` | Commit-level change summary. |
| `outputs/sprint-2/reviews/commit-004-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/cli/index.js` | Adds `wpsc build --watch`. |
| `src/dev-server/createWatchTargets.js` | Re-exports shared watcher target logic. |
| `src/dev-server/startDevServer.js` | Uses shared watcher target helper. |
| `test/devServer.test.js` | Tests watch build behavior with local mock templates. |
| `outputs/sprint-2/README.md` | Marks Commit 004 as done. |

## CLI Added

```bash
wpsc build --project <project-dir> --watch
```

## Architecture Notes

- No public contracts changed.
- Watch Mode reuses existing build and watcher systems.
- `wpsc dev` remains responsible for serving/live reload.
- `wpsc build --watch` only rebuilds static output.

## Verification

```bash
node --test test/devServer.test.js
node --check src/dev-server/watchBuildProject.js
node --check src/cli/index.js
node --check test/devServer.test.js
node src/cli/index.js --help
```

Result:

```text
3 dev/watch tests passed.
Syntax checks passed.
CLI help shows --watch.
```

## Follow-up

- Commit 005 can improve asset processing under watch builds.
- Later commits can pass richer changed-item hints from file changes into incremental planning.

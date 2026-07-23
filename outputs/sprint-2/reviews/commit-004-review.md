# Sprint 2 - Commit Review

**Commit:** 004 - Watch Mode  
**Status:** Approved

## Review

## Architecture

- Watch Mode stays inside the existing dev-server/watcher/build workflow.
- No public contracts or frozen APIs were changed.
- The new helper calls the existing `buildProjectOnce` path.

## Consistency

- `wpsc build --watch` mirrors developer expectations without serving HTTP.
- `wpsc dev` remains the command for serve + live reload.
- Watch target discovery is shared through `src/watcher/createWatchTargets.js`.

## Maintainability

- Watch rebuild logic is isolated in `watchBuildProject`.
- Tests use local mock templates instead of real network sources.
- Watchers can be closed explicitly by tests and CLI signal handlers.

## Future Impact

- Incremental change hints can be added later.
- Build Report can record watch rebuilds later.
- Production build can reuse the same build path without watcher concerns.

## Suggestions

- Add file-change-to-changed-item mapping in a later improvement.
- Add debounce configuration to CLI if users need it.
- Consider exposing watch events to progress reporting.

## Decision

Approved. Commit 004 adds a practical build watch mode while preserving architecture boundaries.

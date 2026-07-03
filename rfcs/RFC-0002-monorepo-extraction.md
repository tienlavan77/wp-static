# RFC-0002 - Monorepo Extraction

Status: `Draft`

## Summary

Extract the proven mini core modules into packages after the single-package
prototype has generated static HTML successfully.

## Mapping

```text
src/shared   -> packages/shared
src/core     -> packages/core
src/router   -> packages/router
src/renderer -> packages/renderer
src/builder  -> packages/builder
src/adapters -> packages/adapters
src/cli      -> packages/cli
```

## Reason

The single-package prototype reduces early coordination cost. Package
extraction should happen only after the build pipeline is proven end to end.

## Risks

- Public APIs may be extracted too early.
- Cross-package imports may leak internal files.
- Package boundaries may add overhead before the framework needs them.

## Migration Plan

1. Extract `@wpsc/shared`.
2. Extract route/render/build packages.
3. Keep imports through package `src/index.js` entry files.
4. Run the Basic Shop example after each extraction.

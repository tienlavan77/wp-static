# Sprint 7 Commit 006 - Site Search Service

## Delivered

- Stable Search Index contract: `wpsc.search-index` version 1.
- Stable Search Results contract with query text, result count, Site identity
  and per-result ranking metadata.
- Search lifecycle operations: create, update, replace, invalidate and rebuild.
- Deterministic query matching and ranking with Vietnamese diacritic
  normalization.
- Explicit Site isolation: a Site cannot query another Site's index through
  the Search Service contract.
- Builder Search Index writer now emits the shared contract while preserving
  the existing `items` payload consumed by the static browser runtime.
- Runtime builds pass `siteId` through Builder into
  `data/search-index.json`.

## Ownership

```text
Normalized Routes
  -> Search Service
  -> Site Search Index
  -> Builder writes static document
  -> Browser queries generated Site data
```

Search policy and lifecycle belong to the Shared Search Service. Builder only
supplies normalized route documents and writes the resulting artifact. No
external search engine, content editor or cross-Site index is introduced.

## Compatibility

The browser's existing static search continues reading `payload.items`. New
fields (`schema`, `schemaVersion`, `siteId`, `invalidated`) extend the contract
without changing existing item fields.

## Validation

```bash
node --test test/searchService.test.js test/mediaService.test.js test/assetPipeline.test.js test/siteRoutePolicy.test.js
node --check framework/src/search/createSearchService.js
git diff --check
```

All checks pass.

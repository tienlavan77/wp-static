# Sprint 1 - Commit Review

**Commit:** 007 - Add create-wpsc scaffold templates  
**Status:** Approved

## Review

## Architecture

- The scaffold helper is a product bootstrap utility and does not change frozen architecture boundaries.
- Generated projects use the existing config contract and adapter validation path.
- No runtime, compiler, adapter, theme, or plugin public contract was changed.

## Consistency

- Template names match Sprint 1 starter template scope: Commerce, Catalog, Blog, Corporate, and Blank.
- CLI keeps the existing `wpsc create <project-name>` shape and adds `--template`.
- Default template is `commerce`, matching WPSC's core commerce direction.

## Maintainability

- Copy logic is centralized in `createProjectScaffold`.
- The helper blocks existing target directories.
- Tests verify all templates and validation compatibility.

## Future Impact

- A future `create-wpsc` bin can call the same helper.
- Templates can grow without changing scaffold logic.
- Install wizard can later offer these templates as selectable choices.

## Suggestions

- Add a standalone `create-wpsc` package/bin when package metadata is ready.
- Add template README files in the documentation commit.
- Add real WordPress/WooCommerce starter configuration variants later.

## Decision

Approved. Commit 007 adds the starter scaffold foundation required by Sprint 1.

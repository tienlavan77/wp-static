# Sprint 1 / Commit 007 - Project Scaffold Templates

## Intent

Add starter scaffolds so a developer can create a first WPSC project from a known template instead of copying an example project manually.

## Files Added

| File | Purpose |
| --- | --- |
| `src/core/createProjectScaffold.js` | Shared scaffold helper for copying starter templates safely. |
| `test/projectScaffold.test.js` | Tests supported templates, copy behavior, overwrite protection, and validation compatibility. |
| `templates/blank/*` | Minimal static starter. |
| `templates/blog/*` | Blog/content starter. |
| `templates/catalog/*` | Product catalog starter without checkout assumptions. |
| `templates/commerce/*` | Commerce starter. |
| `templates/corporate/*` | Corporate/site pages starter. |
| `outputs/sprint-1/recommendations/commit-006-review-recommendations.md` | Stores non-blocking recommendations from Commit 006 review. |
| `outputs/sprint-1/commit-007-project-scaffold.diff.md` | Commit-level change summary. |
| `outputs/sprint-1/reviews/commit-007-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/cli/index.js` | Updates `wpsc create` to support starter templates and `--list-templates`. |
| `outputs/sprint-1/README.md` | Marks Commit 007 as done. |

## CLI Added

```bash
wpsc create <project-name> --template blank
wpsc create <project-name> --template blog
wpsc create <project-name> --template catalog
wpsc create <project-name> --template commerce
wpsc create <project-name> --template corporate
wpsc create --list-templates
```

Default template:

```text
commerce
```

## Architecture Notes

- No architecture boundary changes.
- No public contracts changed.
- Scaffold uses template files and the existing config/validation path.
- Project overwrite is blocked by default.

## Verification

```bash
node --test test/projectScaffold.test.js test/installWizard.test.js test/validateProjectConfig.test.js
node --check src/core/createProjectScaffold.js
node --check src/cli/index.js
node src/cli/index.js create --list-templates
node src/cli/index.js create "$tmpdir/catalog-site" --template catalog
node src/cli/index.js validate --project "$tmpdir/catalog-site" --json
```

Result:

```text
12 tests passed
CLI scaffold smoke test passed
Generated catalog project validation passed with 8 OK, 1 static-only runtime warning, 0 errors
```

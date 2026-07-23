# Sprint 1 / Commit 008 - Installation Documentation

## Intent

Close Sprint 1 by adding basic installation documentation and a final Sprint review so a new developer has a clear path from setup to first build.

## Files Added

| File | Purpose |
| --- | --- |
| `docs/installation.md` | End-to-end Sprint 1 installation guide. |
| `docs/cli-reference.md` | CLI command reference for install, create, validate, doctor, build, serve, and webhook. |
| `outputs/sprint-1/commit-008-installation-docs.diff.md` | Commit-level diff summary. |
| `outputs/sprint-1/reviews/commit-008-review.md` | Commit-level review record. |
| `outputs/sprint-1/final-review.md` | Sprint 1 final review. |

## Files Changed

| File | Change |
| --- | --- |
| `docs/getting-started.md` | Links the new installation guide and adds the Sprint 1 quick start path. |
| `docs/v1/README.md` | Adds Installation Guide and CLI Reference to v1 docs. |
| `outputs/sprint-1/README.md` | Marks Commit 008 as done. |

## Documentation Covers

- Requirements
- Starter templates
- Install wizard
- Installation report
- Real WordPress/WooCommerce `.env` values
- Validation before build
- Doctor diagnostics
- Build
- Static serve
- Current packaging note for future `npx create-wpsc`

## Architecture Notes

- Documentation-only product completion.
- No architecture boundary changes.
- No public contract changes.
- No runtime/compiler/adapter/theme changes.

## Verification

```bash
node src/cli/index.js --help
node src/cli/index.js create --list-templates
node --test test/projectScaffold.test.js test/installWizard.test.js test/validateProjectConfig.test.js
```

Result:

```text
CLI help available
Starter templates listed
Install/scaffold/validate tests passed
```

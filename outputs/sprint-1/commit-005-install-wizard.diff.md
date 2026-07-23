# Sprint 1 / Commit 005 - Install Wizard Skeleton

## Intent

Add the first install workflow for WPSC so a developer can generate a usable project configuration without hand-writing the core setup files.

## Files Added

| File | Purpose |
| --- | --- |
| `src/core/createInstallConfiguration.js` | Generates `.env`, `wpsc.config.js`, `runtime.config.js`, and a minimal theme scaffold. |
| `test/installWizard.test.js` | Verifies install file generation, overwrite protection, placeholder warnings, and validation compatibility. |
| `outputs/sprint-1/recommendations/commit-004-review-recommendations.md` | Stores the approved follow-up recommendations from Commit 004 review. |
| `outputs/sprint-1/commit-005-install-wizard.diff.md` | Commit-level change summary. |
| `outputs/sprint-1/reviews/commit-005-review.md` | Commit-level review record. |

## Files Changed

| File | Change |
| --- | --- |
| `src/cli/index.js` | Adds `wpsc install` command and help text. |

## CLI Added

```bash
wpsc install \
  --project <project-dir> \
  --wordpress-url <url> \
  --woocommerce-url <url> \
  --domain <url> \
  --output-dir <dir> \
  --theme <name> \
  --site-name <name> \
  --force \
  --json
```

## Generated Files

```text
.env
wpsc.config.js
runtime.config.js
theme/layout.js
theme/components/index.js
theme/assets/.gitkeep
public/.gitkeep
```

## Architecture Notes

- Does not change Adapter, Compiler, Runtime, Theme, or Plugin contracts.
- Reuses the existing validation model for install results.
- Keeps Install Wizard as a product bootstrap workflow, not a new framework boundary.
- Generated projects can be checked immediately with `wpsc validate`.

## Verification

```bash
node --test test/installWizard.test.js test/validateProjectConfig.test.js test/validationFormat.test.js test/validationEnvironment.test.js
node --check src/core/createInstallConfiguration.js
node --check src/cli/index.js
node src/cli/index.js install --project "$tmpdir" --wordpress-url https://api.example.com --domain https://store.example.com --output-dir ./public
node src/cli/index.js validate --project "$tmpdir" --json
```

Result:

```text
13 tests passed
CLI install smoke test passed
Generated project validation passed with 12 OK, 0 warnings, 0 errors
```

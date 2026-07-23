# Sprint 1 / Commit 006 - Installation Report

## Intent

Generate an installation report after `wpsc install` so developers and support can inspect the created project without reading source code.

## Files Changed

| File | Change |
| --- | --- |
| `src/core/createInstallConfiguration.js` | Adds `install-report.md` generation, report path validation, environment summary, generated file list, warnings, errors, and next steps. |
| `src/cli/index.js` | Adds `--report <path>` support and prints the report location. |
| `test/installWizard.test.js` | Covers report creation, custom relative report path, and path traversal protection. |
| `outputs/sprint-1/README.md` | Marks Commit 006 as done. |

## Generated Report Includes

- Project directory
- Site name
- Site URL
- WordPress URL
- WooCommerce URL
- Output directory
- Theme
- Node.js version
- Platform and architecture
- Generated files
- Warnings
- Errors
- Next commands

## CLI Added

```bash
wpsc install --project <project-dir> --report reports/install.md
```

Default report path:

```text
install-report.md
```

## Architecture Notes

- No architecture boundary changes.
- No public contract changes.
- Install report uses install results already produced by the install workflow.
- Report path must remain inside the project directory.

## Verification

```bash
node --test test/installWizard.test.js test/validateProjectConfig.test.js test/validationFormat.test.js test/validationEnvironment.test.js
node --check src/core/createInstallConfiguration.js
node --check src/cli/index.js
node src/cli/index.js install --project "$tmpdir" --wordpress-url https://api.example.com --domain https://store.example.com --output-dir ./public --report reports/install.md
node src/cli/index.js validate --project "$tmpdir" --json
```

Result:

```text
15 tests passed
CLI install report smoke test passed
Generated project validation passed with 12 OK, 0 warnings, 0 errors
```

# Sprint 10 Commit 010 - Product Diagnostics & Support Bundle

Status: PASS

## Delivered

- Added the versioned `wpsc.product-support-bundle` contract.
- Added Site-aware operational support bundle generation.
- Added Product, Runtime, Health, Site summary, Deployment summary and
  Diagnostics snapshots.
- Added recent error log extraction as NDJSON.
- Added mandatory Security Boundary projection before every bundle write.
- Added Bundle manifest with ID, creation time and file list.

## Support Bundle Layout

```text
storage/support-bundles/<bundle-id>/
├── bundle.json
├── product.json
├── runtime.json
├── health.json
├── site-summary.json
├── deployment-summary.json
├── recent-errors.ndjson
└── diagnostics.json
```

## Security Boundary

Every collected snapshot is passed through `SecretsBoundary.publicProjection()`
before it is serialized. The bundle therefore excludes/redacts fields shaped as:

```text
password
secret
token
credential
authorization
api key
consumer key / consumer secret
```

The service does not read `.env`, credential files, provider databases, static
website output or raw backups.

## Validation

```bash
node --test test/productSupportBundleService.test.js test/secretsBoundaryService.test.js test/operationalObservabilityService.test.js test/sprint10InstallationUpgradeE2E.test.js
git diff --check
```

Support Bundle, Secrets, Observability and Sprint 10 E2E validation passed with
6 tests.

## Architecture Result

Commit 010 uses frozen Security and Observability contracts to provide
supportable product diagnostics without exposing secrets or adding Runtime
business logic. Architecture / Packaging Audit remains Commit 011.

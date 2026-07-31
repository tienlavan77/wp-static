# Sprint 10 Commit 008 - Personal Edition Profile

Status: PASS

## Delivered

- Added the versioned `wpsc.product-profile` contract.
- Added the `personal` Profile on top of the shared WPSC Core.
- Added Full Core policy: core capabilities remain enabled.
- Added small-scale default limits: one Site and one Operator.
- Added local/single-instance operating mode metadata.
- Added Personal onboarding steps.
- Added read-only Site Registry usage assessment and limit diagnostics.

## Personal Model

```text
WPSC Core
    -> Personal Profile / Policy
    -> Full Core + small-scale defaults
```

The Personal profile is not a separate Core distribution and does not remove
Backup, Restore, Deployment, WooCommerce, Forms, SEO, Cache, Health, Logs or
Security boundaries.

## Default Policy

```text
Core capability     full
Site limit          1
Operator limit      1
Operating mode      local-single-instance
```

The profile reports when the operational defaults are exceeded. It introduces no
license key, license server, billing, entitlement, feature paywall or commercial
dependency.

## Personal Onboarding

```text
bootstrap
    -> create-site
    -> connect-source
    -> build-site
    -> deploy-site
```

## Validation

```bash
node --test test/personalEditionProfileService.test.js test/productPackageService.test.js test/productMigrationService.test.js test/sprint9ProductionOperationsE2E.test.js
git diff --check
```

Personal Profile, Product Package, Migration and Sprint 9 regression validation
passed with 6 tests.

## Architecture Result

Commit 008 introduces a policy profile without forking WPSC Core or adding
commercial infrastructure. Installation / Upgrade E2E remains Commit 009.

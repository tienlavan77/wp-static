# Test Ownership Layout

`test/` is the executable validation suite. Test filenames remain stable during
layout normalization so relative import, fixture and release checks retain
their exact semantics.

## Ownership Taxonomy

| Area | Test ownership |
| --- | --- |
| Site and Provision | `site*.test.js`, `provisioning*.test.js` |
| Setup | `setup*.test.js`, `firstBuildReadinessService.test.js`, `webhookActivationService.test.js` |
| Runtime | `runtime*.test.js`, `siteRuntime*.test.js`, `dashboard*.test.js`, `installerController.test.js`, `commerceRuntime.test.js`, `accountUi.test.js` |
| Scheduler | `scheduler*.test.js`, `job*.test.js`, `schedulerTriggerIntegration.test.js` |
| Builder | `build*.test.js`, `builder*.test.js`, `assetPipeline.test.js`, `content*.test.js`, `template*.test.js`, `theme*.test.js`, `seo.test.js`, `visualBuilder*.test.js` |
| Output | `outputPipeline.test.js`, `productionBuild.test.js` |
| Framework support | `apiCompatibility.test.js`, `packageBoundaries.test.js`, `validation*.test.js`, `deepFreeze.test.js`, `escapeHtml.test.js` |
| E2E | `siteRuntimeE2E.test.js` |

## Fixtures

`test/fixtures/` is the only fixture root. Fixture content is grouped by
external boundary (`wordpress/`, `woocommerce/`, `webhook/`), theme, assets and
real-project scenarios.

Future physical test-directory moves require a dedicated compatibility audit:
all imports, `new URL()` calls, fixture copy paths and release checks must be
rewritten in the same commit. This normalization intentionally freezes the
ownership taxonomy without changing executable test paths.

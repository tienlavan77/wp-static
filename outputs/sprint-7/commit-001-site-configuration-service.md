# Sprint 7 Commit 001 - Site Configuration Service

## Delivered

- Site-scoped `settings.json` persistence through Site Repository.
- Immutable Site Configuration Service with default general, theme, feature and
  runtime settings.
- Stable schema/version and diagnostics contract.
- Explicit `siteId` on every settings document.
- Runtime composition injects `siteConfiguration` as a Site Runtime service.

## Boundary

Workspace Runtime configuration remains responsible for shared adapter/server
settings. Site settings own non-sensitive Site configuration only. WordPress
content authority, source credentials and webhook secrets remain in their
existing dedicated boundaries.

## Validation

```bash
node --test test/siteConfigurationService.test.js test/siteRuntimeInstance.test.js
node framework/src/cli/index.js --help
git diff --check
```

All checks pass.

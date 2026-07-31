# Sprint 8 Commit 010 - Extension Contract

Status: PASS

## Delivered

- Versioned `wpsc.extension` contract.
- Extension identity, version, capabilities, configuration and lifecycle.
- Explicit `runtime` and `site` scope.
- Site Context exposed through the Plugin SDK.
- Site-scoped extensions rejected when no Site Context exists.
- Deterministic alphabetical registration in `loadAll`.
- Explicit lifecycle unload with cleanup callback.
- Stable hook and service registration through existing SDK boundaries.
- Public compatibility fields remain stable while contract metadata is exposed
  on the extension record.

## Supported Capabilities

```text
content
commerce
theme
routing
seo
build
publishing
```

Extensions cannot register unsupported capability names and cannot bypass the
Runtime Context, Service Container or Hook System.

## Validation

```bash
node --test test/extensionContract.test.js test/extensionLoader.test.js test/pluginSdk.test.js test/hookSystem.test.js test/runtimeContext.test.js
node --check framework/src/runtime/extensions/createExtensionLoader.js
git diff --check
```

Focused Extension Contract, Extension Loader, Plugin SDK, Hook System, Runtime
Context and Builder plugin compatibility validation passed with 22 tests.

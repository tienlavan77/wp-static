# Sprint 3 / Commit 004 - Plugin SDK Foundation

## Summary

Added a minimal Plugin SDK foundation for runtime extensions.

## Files Changed

- `src/runtime/createPluginSdk.js`
- `test/pluginSdk.test.js`
- `outputs/sprint-3/README.md`
- `outputs/sprint-3/commit-004-plugin-sdk-foundation.diff.md`
- `outputs/sprint-3/reviews/commit-004-review.md`

## Architecture Notes

- Plugin SDK belongs to Runtime Kernel.
- Plugin code receives a controlled API instead of raw internals.
- Services are registered and resolved through `context.services`.
- Hooks are registered through Hook System with plugin source metadata.
- The SDK does not load plugins; Extension Loader remains Commit 005.

## SDK Surface

- `sdk.name`
- `sdk.version`
- `sdk.context`
- `sdk.services.has`
- `sdk.services.resolve`
- `sdk.services.register`
- `sdk.hooks.tap`
- `sdk.hooks.list`

## Verification

```bash
node --test test/pluginSdk.test.js test/serviceContainer.test.js test/hookSystem.test.js
node --check src/runtime/createPluginSdk.js
```

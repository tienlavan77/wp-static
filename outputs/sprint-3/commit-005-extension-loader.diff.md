# Sprint 3 / Commit 005 - Extension Loader

## Summary

Added the Extension Loader foundation for loading runtime plugin descriptors and setup functions.

## Files Changed

- `src/runtime/createExtensionLoader.js`
- `test/extensionLoader.test.js`
- `outputs/sprint-3/README.md`
- `outputs/sprint-3/commit-005-extension-loader.diff.md`
- `outputs/sprint-3/reviews/commit-005-review.md`

## Architecture Notes

- Extension Loader belongs to Runtime Kernel.
- It consumes Runtime Context, Service Container, Hook System, and Plugin SDK.
- It creates a Plugin SDK per extension.
- It does not introduce filesystem discovery, marketplace behavior, or interface-specific logic.

## Loader Capabilities

- load plugin objects
- load setup functions
- load multiple extensions
- prevent duplicate extension names
- replace an existing extension explicitly
- emit `extension:loaded`
- expose public extension metadata

## Verification

```bash
node --test test/extensionLoader.test.js test/pluginSdk.test.js test/serviceContainer.test.js test/hookSystem.test.js
node --check src/runtime/createExtensionLoader.js
```

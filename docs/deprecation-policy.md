# Deprecation Policy

Stable APIs are not removed without a deprecation window.

## Deprecation Rules

- Mark the API as deprecated in docs first.
- Keep the API working for at least one minor release.
- Provide a replacement API before removal.
- Add a migration note with old and new examples.
- Keep test coverage for both old and replacement APIs during the deprecation window.

## Runtime Warnings

Runtime warnings should be used sparingly. They are appropriate when:

- The deprecated API can be detected reliably.
- The warning will not spam static builds.
- The warning includes a replacement path.

## Removal

Deprecated stable APIs may be removed only in a major release. Provisional APIs can change before v1.0, but should still be noted in the changelog when the change affects examples, plugins, or builder workflows.

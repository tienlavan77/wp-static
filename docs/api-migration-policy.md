# API Migration Policy

WPSC follows semantic versioning after v1.0.

## Patch Releases

Patch releases may include:

- Bug fixes.
- Documentation updates.
- New optional fields.
- Performance improvements with equivalent behavior.

Patch releases must not require user code changes.

## Minor Releases

Minor releases may include:

- New public APIs.
- New optional config fields.
- New adapters, blocks, or deployment helpers.
- Deprecation notices for APIs that will change in the next major release.

Minor releases must keep existing stable APIs working.

## Major Releases

Major releases may include breaking changes. Each breaking change must include:

- Reason for the change.
- Old API example.
- New API example.
- Migration steps.
- Compatibility note for generated output when relevant.

## Project Migration Checklist

1. Read the release notes.
2. Run `npm test`.
3. Run `node src/cli/index.js doctor --project <project-dir>`.
4. Run a full build.
5. Check route contract: `domain/slug`, no trailing slash.
6. Check SEO output, sitemap, robots.txt.
7. Check incremental builds for changed products, pages, terms, and layouts.

# Visual Builder Fallbacks

Visual builder rendering is static-build friendly: missing data should not crash the whole build.

Current fallback behavior:

- Missing block schema returns a render error.
- Missing block schema renders empty HTML by default.
- Preview/debug callers can pass `showFallbacks: true` to render a visible `wpsc-builder-fallback` marker.
- Missing optional binding values use binding fallback values when provided.

Required block props still use normal block validation. This keeps production output quiet while giving builder previews enough information to show what is missing.

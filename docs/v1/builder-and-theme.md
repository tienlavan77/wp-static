# Builder And Theme

Status: stable in WPSC v1.0.

WPSC v1 uses the theme API and visual-builder layout documents together.

## Theme Layer

Themes provide:

- fallback layouts.
- content-type layouts.
- reusable components.
- theme assets.
- block libraries.

## Builder Layer

The builder stores layout documents with rows, columns, sections, and blocks. Production
builder workflows support draft, preview, publish, and rollback flows.

## Rendering Rule

Builder layouts render through the same HTML escaping and block registry pipeline used by
static pages, so custom blocks should be declared with schemas and renderer functions.

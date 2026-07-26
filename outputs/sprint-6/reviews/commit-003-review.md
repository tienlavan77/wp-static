# Sprint 6 - Commit 003 Review

## Commit

003 - Setup UI Inputs

## Status

Ready for review.

## Review Focus

- WooCommerce CK/CS fields are visible.
- WordPress application credentials are visible.
- Runtime and webhook secrets are visible.
- Required setup fields have validation messages.
- Secrets are not persisted in this commit.

## Architecture

The change stays inside Installer and Release Package Structure.

It does not modify:

- Adapter contracts
- Compiler contracts
- Runtime contracts
- Theme contracts
- Build engine boundary

## Consistency

This matches the Sprint 6 setup input list:

- Site name
- Site domain
- WordPress API URL
- WooCommerce API URL
- WooCommerce Consumer Key
- WooCommerce Consumer Secret
- WordPress username/application username
- WordPress application password
- Session secret
- Auth bridge secret
- Webhook secret
- Optional runtime port

## Maintainability

The browser UI and release fallback use the same field names so Commit 004 can write config from one input shape.

## Future Impact

Commit 004 should consume these fields and write:

- `config/.env`
- `config/project.json`
- `config/runtime.json`

Secret values must remain outside `public/`.

## Decision

Pending reviewer approval.

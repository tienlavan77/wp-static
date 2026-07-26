# Sprint 6 - Commit 002 Review

## Commit

002 - Release Front Controller

## Status

Ready for review.

## Review Focus

- Zero custom virtual host route rule
- First-visit setup behavior
- Install lock detection
- Static fallback behavior
- Scope discipline

## Architecture

The front controller lives in the release package structure and stays separate from installer service logic.

The implementation supports:

```text
/
-> public/index.php
-> if no config/install.lock
-> installer/setup.php
```

After installation:

```text
/
-> public/index.php
-> static output fallback
```

## Consistency

This matches the Sprint 6 enhanced roadmap requirement:

```text
No manual /install, /setup, or /webhook virtual host routes.
```

## Maintainability

The setup fallback is a placeholder shell only. Future commits can replace the body with the shared Browser Wizard service without changing the vhost requirement.

## Future Impact

Commit 003 should expand setup inputs.

Commit 004 should write release-local config and secrets.

Commit 010 should ensure the Production CLI uses the same service layer as the Browser Wizard.

## Decision

Pending reviewer approval.

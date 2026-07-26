# Sprint 5 - Commit 007 Diff Summary

## Commit

007 - Deployment Guide

## Files Changed

- `docs/release-deployment-guide.md`
- `docs/sprint-5-production-installer-release-package.md`
- `outputs/sprint-5/README.md`
- `outputs/sprint-5/reviews/commit-007-review.md`

## Summary

Commit 007 adds the production deployment guide for release packages.

## Behavior

- Documents `vps` and `shared-hosting` modes.
- Shows `wpsc release build` command usage.
- Shows rsync upload workflow.
- Provides an Nginx configuration example.
- Lists required production secrets.
- Defines post-install checks, rollback, and troubleshooting notes.

## Out of Scope

- Installer recovery.
- Release validation.
- Zip archive generation.
- New runtime or build behavior.

## Verification

```bash
test -f docs/release-deployment-guide.md
rg -n "wpsc release build|/install|install.lock|nginx" docs/release-deployment-guide.md
```

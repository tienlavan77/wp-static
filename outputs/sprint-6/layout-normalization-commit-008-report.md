# Project Layout Normalization - Commit 008 Report

Date: 2026-07-29

## Ownership Result

```text
framework/src/cli/  Canonical CLI commands and composition
scripts/            Development and release utilities
packages/           Workspace package compatibility boundaries
framework/src/dev-server/ and watcher/  Development runtime tooling
```

Canonical CLI commands, npm scripts, `wpsc` bin, Runtime bootstrap and package
exports retain their existing paths and behavior.

## Commit Proposal

```text
docs(layout): clarify cli and tooling ownership
```

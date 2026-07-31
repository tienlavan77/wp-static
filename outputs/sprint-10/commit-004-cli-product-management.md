# Sprint 10 Commit 004 - CLI Product Management

Status: PASS

## Delivered

- Added a thin Product CLI command adapter.
- Added stable Product command vocabulary.
- Added structured JSON output with `--json`.
- Added human-readable tabular output for Site, Backup and Deployment lists.
- Added deterministic exit codes: `0` success, `1` service failure, `2` unknown
  or incomplete Product command.
- Added CLI delegation to existing Site Operations, Backup, Deployment, Registry
  and Runtime services.

## Product Commands

```bash
wpsc status [--project <workspace>] [--json]
wpsc site list [--project <workspace>] [--json]
wpsc site inspect <site-id> [--project <workspace>] [--json]
wpsc backup list <site-id> [--project <workspace>] [--json]
wpsc deployment list <site-id> [--project <workspace>] [--json]
wpsc runtime status [--project <workspace>] [--json]
```

## Boundary

```text
CLI
  -> Product CLI adapter
  -> existing Service / Control Plane
```

The CLI does not implement Site lifecycle, Backup, Deployment, Runtime or
authorization business logic. It only maps stable command vocabulary to the
existing product services and formats their result.

## Validation

```bash
node --test test/productManagementCli.test.js
node framework/src/cli/index.js --help
git diff --check
```

The Product CLI adapter test passed. The Product command vocabulary is visible
in the official CLI help output.

## Architecture Result

Commit 004 creates a stable product-management gateway without changing Runtime
Bootstrap, Build commands, package contracts or development workflow. Upgrade /
Migration Framework remains Commit 005.

# Project Layout Freeze - Commit 010

Date: 2026-07-29

Status: PASS

## Freeze Statement

The WPSC Project Layout is the official baseline for subsequent sprints.
Further changes must preserve this ownership model or be introduced through an
approved architecture decision.

## Validated Ownership

| Area | Canonical location |
| --- | --- |
| Framework source | `framework/src/` |
| Site, Provision and Setup | `framework/src/site/`, `provision/`, `setup/` |
| Runtime | `framework/src/runtime/` by Bootstrap, Router, Installer, Dashboard, Source, Webhook, Account, Commerce and API |
| Scheduler infrastructure | `framework/src/scheduler/` by Policy, Queue, Dispatcher and Contracts |
| Build and Builder | `framework/src/build/`, `framework/src/builder/` |
| Output | `framework/src/output/` |
| Shared primitives | `framework/src/shared/` |
| Current documentation | `docs/` |
| Historical evidence | `outputs/` |
| Themes and bridges | `themes/`, `integrations/` |
| Tooling | `framework/src/cli/`, `scripts/`, `packages/` |
| Tests and fixtures | `test/`, `test/fixtures/` |

## Freeze Rules

- Browser, CLI and Webhook remain gateways; they do not own business logic.
- Output Pipeline remains the only writer of Site build output.
- Themes remain Builder inputs; integrations remain external bridges.
- Test taxonomy remains architecture-owned while executable test paths remain
  stable.
- Site configuration, credentials, storage and generated public files remain
  outside Framework source and are never included in layout commits.

## Validation Gate

The normalization audit checked ownership records, retired root-source
references, normalized module locations, CLI entry resolution and the full
test suite. No feature, Runtime flow, Builder pipeline, Scheduler policy or
public contract was intentionally changed by the layout work.

## Commit Proposal

```text
docs(layout): freeze architecture ownership baseline
```

# Project Layout Normalization - Commit 006 Report

Date: 2026-07-29

## Result

Project material boundaries are now explicit:

```text
framework/    executable Framework source
docs/         current documentation, contracts, ADRs and roadmaps
outputs/      historical reports, audits and implementation evidence
rfcs/         proposed architectural changes
templates/    executable CLI scaffold assets
```

## Boundary Decision

Templates, themes, examples and integrations were not moved. They are consumed
by CLI, tests or Runtime workflows and are product assets, not documentation.
Historical output paths were retained so old sprint evidence and links remain
valid.

## Commit Proposal

```text
docs(layout): clarify project material ownership
```

# Project Layout Normalization - Commit 007 Report

Date: 2026-07-29

## Ownership Result

```text
themes/        Shared executable presentation assets
integrations/  External system bridges and adapters
plugins/       Reserved shared plugin workspace
sources/       Reserved shared source workspace
```

Theme remains a Builder rendering input. WordPress Auth, Webhook and Mail
bridges remain Integration assets. Neither boundary owns Runtime flow, Builder
pipeline, authentication policy or webhook scheduling.

## Stable Paths

No executable Theme or bridge path was moved because Runtime Builder and
deployment instructions consume the existing locations directly.

## Commit Proposal

```text
docs(layout): clarify theme and integration ownership
```

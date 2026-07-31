# Project Layout Normalization - Commit 005 Report

Date: 2026-07-29

## Result

Scheduler infrastructure now has explicit ownership folders for policy, queue,
dispatcher and contracts. The legacy rebuild queue moved under Scheduler queue
ownership. Webhook remains a gateway and is not absorbed into Scheduler.

No Scheduler policy, queue flow, dispatcher logic, Build trigger or Runtime
integration behavior changed; imports and root exports were rewritten only.

## Validation

```bash
node --test
node framework/src/cli/index.js --help
git diff --check
```

## Commit Proposal

```text
refactor(scheduler): normalize infrastructure ownership
```

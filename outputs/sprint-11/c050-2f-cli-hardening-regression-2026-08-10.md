# C050-2F CLI Hardening, Regression and Operator Documentation

```text
C050-2F = PASS for C050 scope
Full repository regression = BLOCKED by unrelated pre-existing failures
VPS mutation = NONE
Publication = NONE
Rollout = NONE
C049 semantics = UNCHANGED
C048 semantics = UNCHANGED
```

## Implemented

- Stable required-argument error codes for release verification/publication.
- Stable `--confirm` and `--dry-run` semantics.
- Dry-run success is `ok: true` with `mutation: NONE`.
- Failure/security tests for C041 rejection, publisher conflict, invalid config,
  missing arguments and secret redaction.
- Root rollout contract remains Registry-owned and CWD-independent.
- Added [c050-operator-runbook.md](c050-operator-runbook.md).
- Added [c050-cli-contract.md](c050-cli-contract.md).

## Focused Validation

```text
tests 23
pass 23
fail 0
cancelled 0
skipped 0
```

The focused selection covers C050-2A through C050-2F, C049 routing/configuration
and local public CLI E2E.

`git diff --check`: PASS.

## Full Repository Regression

`node --test` terminated naturally but reported failures outside C050, including
existing Advanced SEO sitemap, incremental asset build, Commerce Publishing
Gateway, prepared Runtime content and Site Runtime fixture expectations. These
were not modified because they are unrelated owner contracts; no C050 failure
was observed in the focused selection.

The last trusted frozen C028-C049 closeout remains 121/121 PASS.

## Code Freeze Gate

C050 code is ready to freeze for C050-R1. Any subsequent change under the
Product/package/CLI publication or rollout paths requires rebuilding and
reaccepting Release `1.2.0`; an already accepted immutable artifact must not be
overwritten.

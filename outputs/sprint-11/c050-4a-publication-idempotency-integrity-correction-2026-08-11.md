# C050-4A Publication Idempotency Integrity Correction

## Result

```text
C050-4A = PASS
```

## Defect Corrected

The old publication owner validated the incoming artifact, but an existing
version was considered idempotent solely when `release.json` matched the
incoming Product/version/size/SHA-256 identity. It did not verify that the
already-published bundle still existed or that its actual bytes matched the
metadata.

Consequently, matching metadata plus a missing, truncated or same-size altered
bundle could incorrectly return `IDEMPOTENT_SUCCESS`.

The correction remains inside:

```text
framework/src/product/createReleaseArtifactPublisher.js
```

and uses the existing stable failure code:

```text
RELEASE_IDENTITY_CONFLICT
```

No new error taxonomy or repair owner was introduced.

## Contract

While holding the existing per-version publication lock,
`IDEMPOTENT_SUCCESS` now requires all of the following:

```text
release.json exists and matches Product/version/size/SHA-256
canonical published bundle exists
published bundle is a regular file
published bundle byte size matches the immutable identity
published bundle SHA-256 matches the immutable identity
```

Any missing, unreadable, non-regular or inconsistent published bundle is
rejected as `RELEASE_IDENTITY_CONFLICT`. The owner does not overwrite, repair
or recreate an existing immutable destination.

A valid idempotent repeat now reports:

```text
status: IDEMPOTENT_SUCCESS
mutation: NONE
```

## Regression

```text
intact repeat: PASS
missing bundle: PASS
truncated bundle: PASS
same-size altered bundle: PASS
metadata inconsistency: PASS
destination preservation: PASS
concurrency: PASS
```

Regression details:

```text
matching metadata + missing bundle -> rejected, metadata preserved, no repair
matching metadata + truncated bundle -> rejected, truncated bytes preserved
matching metadata + same-size altered bytes -> rejected, altered bytes preserved
inconsistent release.json -> rejected, metadata and bundle preserved
concurrent identical intact publication -> one PUBLISHED + one valid IDEMPOTENT_SUCCESS
concurrent repeat with missing bundle -> no IDEMPOTENT_SUCCESS
```

## Tests

Focused C050-4A publisher suite:

```text
tests: 11
pass: 11
fail: 0
cancelled: 0
skipped: 0
```

Focused C050/C049 orchestration selection:

```text
C050 root CLI: 4/4 PASS
C050 rollout facade: 4/4 PASS
C050 read-only/configuration: 6/6 PASS
C050 local E2E: 3/3 PASS
C049 lifecycle/composition: 17/17 PASS
```

Combined validation:

```text
tests: 45
pass: 45
fail: 0
cancelled: 0
skipped: 0
```

No unrelated repository-wide test suite was run.

## Integrity

```text
git diff --check: PASS
```

## Mutation

```text
publication: NONE
rollout: NONE
VPS mutation: NONE
C049 mutation: NONE
C048 mutation: NONE
artifact overwrite: NONE
```

All mutation in the regression suite was confined to temporary local fixtures
that were removed by the tests.

## Semantics

```text
C050 semantics: corrected only for publication idempotency integrity
C049 semantics: UNCHANGED
C048 semantics: UNCHANGED
```

The public C050 CLI contract, release-operations configuration contract,
publication layout, per-version lock, rollout facade and Installation owners
remain unchanged.

## Next Boundary

```text
C050-4A = PASS
Next task = C050-4 Final Operational Workflow Audit
```

C050 is not declared frozen by this corrective task. C050-4 must be rerun as a
separate final audit using the corrected publication-owner evidence.

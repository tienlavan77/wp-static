# C050-4 Final Operational Workflow Audit

## Verdict

```text
C050-4 = BLOCKED
C050 = NOT READY FOR FREEZE
C050-R1 = NOT YET OPERATIONALLY ACCEPTED
first failing gate = immutable publication idempotency does not verify the existing published bundle
```

The trusted C050-3B publication and C050-3C rollout remain valid. This audit did
not publish, rollout, update, recover, restart or otherwise mutate the VPS.

## Finding

### C050 publisher can report idempotent success for a missing or corrupted existing bundle

The publication owner validates the incoming artifact before taking the
per-version lock. When the destination already contains `release.json`, it then
compares only that metadata with the incoming release identity:

```text
framework/src/product/createReleaseArtifactPublisher.js:30
framework/src/product/createReleaseArtifactPublisher.js:32
```

If metadata matches, the owner returns `IDEMPOTENT_SUCCESS` without checking:

```text
the published bundle exists
the published bundle size matches release.json
the published bundle SHA-256 matches release.json
```

Therefore this state is currently possible:

```text
release.json = expected wpsc 1.2.0 identity
published bundle = missing or modified
repeated identical publication = IDEMPOTENT_SUCCESS
```

This violates the C050-4 publication gate:

```text
same product + version + size + SHA-256
-> IDEMPOTENT_SUCCESS
-> existing artifact preserved
```

The current test checks `release.json` equality and published file size after an
untampered repeat, but does not cover a missing or corrupted existing bundle:

```text
test/c050ReleaseArtifactPublisher.test.js:16
test/c050ReleaseArtifactPublisher.test.js:21
test/c050ReleaseArtifactPublisher.test.js:22
```

## Required Remediation

The C050 publication owner must, while holding the existing per-version lock:

```text
1. read and validate release.json
2. resolve the expected published bundle path
3. require the bundle to exist as a regular artifact
4. compare its byte size with the immutable release identity
5. hash the published bundle and compare SHA-256
6. return IDEMPOTENT_SUCCESS only when metadata and bundle identity both match
7. otherwise return RELEASE_IDENTITY_CONFLICT or a stable integrity-specific failure
8. never overwrite or repair the existing immutable destination automatically
```

Required regression cases:

```text
identical repeat with intact artifact -> IDEMPOTENT_SUCCESS
matching metadata with missing artifact -> rejected
matching metadata with truncated artifact -> rejected
matching metadata with same-size altered bytes -> rejected
rejection preserves the existing destination and metadata
concurrent publication behavior remains fenced
```

This is a concrete defect in an existing C050 contract. It must be fixed and
revalidated in a new corrective C050 revision before C050-4 can pass.

## Gates Already Satisfied

Evidence from the completed C050 phases remains trusted:

```text
C050-2A..2F: PASS
C050-R1: PASS
C050-3B publication: PASS
C050-3B HTTPS retrieval: PASS
C050-3C rollout: PASS
Installation active Release: 1.2.0
Previous Release 1.1.0 retained: YES
C047 health: HEALTHY
C049 transaction: COMPLETED
C049 evidence: PASS
Protected-state equality: PASS
C050 publication evidence: PASS
C050 rollout evidence: PASS
Registry default: wpsctest-c048
Registry workspace: /home/data/sites/production/wpsctest
retired production/wp-static active references: NONE
wpsc.local classification: DEVELOPMENT ONLY
Production Internet distribution: NOT ESTABLISHED
```

These successful operational results do not remove the publication-owner
contract defect found by the final freeze audit.

## Focused Check

The current publisher tests pass but do not exercise the failing integrity
scenario:

```text
test/c050ReleaseArtifactPublisher.test.js
tests: 6
pass: 6
fail: 0
cancelled: 0
skipped: 0
```

```text
git diff --check: PASS
```

The wider C050/C049 regression selection was not continued after identifying
the first failing freeze gate, as required by the audit stop rule.

## Safety

```text
VPS mutation during C050-4: NONE
publication: NOT RUN
rollout: NOT RUN
C049 update/recover: NOT RUN
C048: NOT RUN
Runtime restart: NONE
systemd restart: NONE
Nginx mutation: NONE
configuration mutation: NONE
artifact overwrite: NONE
private-key access: NONE
C049 semantics: UNCHANGED
C048 semantics: UNCHANGED
```

## Next Authorized Task

Create a narrowly scoped corrective task for existing publication idempotency
integrity, add the missing regressions, rerun focused C050/C049 validation, and
then rerun C050-4. Do not repeat publication or rollout merely to validate this
local publication-owner correction.

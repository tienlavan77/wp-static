# C050-3B Production Publication Validation

## Preflight

The authorized target was the frozen C050-R1 Product Release:

```text
Product: wpsc
Version: 1.2.0
Architecture: 2.02
Runtime: 1.0
Channel: development
Distribution: https://wpsc.local/
Expected size: 2482947
Expected SHA-256: c618b1f17f6f913b912e6846a4161f3ea3a40c026e040040c2468d1e6e316af0
```

The local frozen transport bundle matched the expected byte size and SHA-256
before publication. No artifact was rebuilt or modified.

## C041

C041 was re-run through the public C050 CLI using the frozen signed package and
reviewed public verification key.

```text
accepted: true
verification: C041
mutation: NONE
product: wpsc
version: 1.2.0
architecture: 2.02
runtime: 1.0
```

```text
C041 = PASS
```

No duplicate verifier or verification bypass was introduced.

## Publication

The public C050 publication command delegated to the approved publication
owner with explicit confirmation and channel `development`.

```text
ok: true
status: PUBLISHED
channel: development
productId: wpsc
version: 1.2.0
size: 2482947
sha256: c618b1f17f6f913b912e6846a4161f3ea3a40c026e040040c2468d1e6e316af0
verification: C041
idempotent: false
mutation: PUBLICATION
destination: [REDACTED]
```

```text
Publication = PASS
```

Publication was not performed with `scp`, `rsync`, `cp`, `mv`, an upload
request, direct publication-root manipulation or the historical C048 server.

## Distribution Verification

The published artifact was retrieved through the public development HTTPS
boundary:

```text
URL: https://wpsc.local/1.2.0/wpsc-1.2.0.bundle.json
HTTP status: 200
X-WPSC-Boundary: development-distribution
Content-Length: 2482947
retrieved size: 2482947
retrieved SHA-256: c618b1f17f6f913b912e6846a4161f3ea3a40c026e040040c2468d1e6e316af0
schema: wpsc.production-package-bundle
schemaVersion: 1
productId: wpsc
version: 1.2.0
```

The retrieved bundle exactly matches the frozen C050-R1 identity. It is not a
historical `1.0.0` or `1.1.0` artifact, an Installation artifact, or a
conflicting same-version artifact.

```text
Distribution Verification = PASS
```

## Evidence

Redacted publication evidence was recorded at:

```text
outputs/sprint-11/c050-3b-development-publication-evidence.json
schema: wpsc.c050-publication-evidence
schemaVersion: 1
```

The evidence records C041 acceptance, publication result, immutable identity,
HTTPS retrieval and the mutation summary. It contains no private key,
credential, credential-bearing URL, secret value or protected Installation
content.

## Safety

Post-publication read-only checks proved:

```text
Installation active pointer: releases/1.1.0
global wpsc version: 1.1.0
systemd state: active/running
systemd MainPID: 2621950
C049 transaction: release-update-1786353958230
C049 transaction state: COMPLETED
C049 activeOperation: null
C049 lastError: null
```

The existing completed C049 transaction remained unchanged; no C049 update
transaction was created by publication.

```text
Rollout: NOT RUN
C049 update: NOT RUN
C049 recover: NOT RUN
C048: NOT RUN
Runtime restart: NONE
systemd restart: NONE
Core activation: NONE
Installation mutation: NONE
protected-state mutation: NONE
frozen Release 1.2.0 mutation: NONE
C049 semantics: UNCHANGED
C048 semantics: UNCHANGED
```

## Tests

Focused tests relevant to the publication execution path terminated naturally:

```text
test/c050ReleaseArtifactPublisher.test.js: 6/6 PASS
test/c050RootCliWiring.test.js: 4/4 PASS
test/c050ReadOnlyReleaseOperations.test.js: 6/6 PASS
test/c050LocalE2E.test.js: 3/3 PASS
total: 19/19 PASS
fail: 0
cancelled: 0
skipped: 0
```

These tests cover C041 prerequisite enforcement, confirmation, dry-run,
publication, idempotency, immutable identity conflict, concurrency, atomic
staging cleanup, configuration, stable/redacted errors, explicit Installation
identity and delegated local workflow behavior.

```text
git diff --check: PASS
```

No unrelated repository-wide regression suite was run.

## Verdict

```text
C041 = PASS
Publication = PASS
Channel = development
Distribution = https://wpsc.local/
Product = wpsc
Version = 1.2.0
Size = 2482947
SHA-256 = c618b1f17f6f913b912e6846a4161f3ea3a40c026e040040c2468d1e6e316af0

Installation = 1.1.0 unchanged
Rollout = NOT RUN
C049 update = NOT RUN
C048 = NOT RUN
Runtime restart = NONE
systemd restart = NONE
VPS Installation mutation = NONE

C050-3B = PASS
```

C050-3B stops here. C050-3C Development Installation Rollout Validation
requires separate explicit authorization and was not started.

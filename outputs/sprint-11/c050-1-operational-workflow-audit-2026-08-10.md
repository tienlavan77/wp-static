# C050-1 Operational Workflow Audit

## Verdict

```text
C050-1 Operational Workflow Audit = PASS
C049 semantics = UNCHANGED
C048 semantics = UNCHANGED
VPS mutation = NONE
```

The repository already contains authoritative owners for local release packaging,
release validation, Installation selection/routing, C049 release update lifecycle,
Runtime restart, health inspection and C049 evidence. It does not currently expose
an authoritative production artifact publisher. C050 must therefore add a small
publication owner before a public mutating `publish` facade can be wired safely.

## Current Workflow Audit

| Current operation | Existing owner | Classification | Facade action |
| --- | --- | --- | --- |
| Build deployable website release directory | `buildReleasePackage` / `wpsc release build` | Normal release operation | Preserve existing command semantics |
| Validate website release directory | `validateReleasePackage` / `wpsc release validate` | Normal release operation | Preserve existing command semantics |
| Build signed Product package bundle | `createProductionPackageBuilder` (C040) | Normal Product release operation | Wrap with explicit Product namespace |
| Verify signed Product package | `createProductionPackageVerifier` (C041) | Mandatory release evidence | Delegate; do not duplicate verification |
| Publish bundle and release metadata | No authoritative production owner found | Genuine missing capability | Add injected/configured publisher owner |
| Resolve Installation workspace | Installation Registry / C049 production composition | Normal Installation operation | Resolve by Installation ID, never CWD |
| Check available Product update | C049 `releaseUpdate.check` | Normal read-only Installation operation | Existing `update check` route |
| Execute Product update | C049 `releaseUpdate.update` | Normal mutating Installation operation | Existing `update` route; facade may orchestrate only |
| Inspect update transaction | C049 `releaseUpdate.status` | Mandatory evidence / recovery input | Existing `update status` route |
| Recover failed update | C049 `releaseUpdate.recover` | Recovery-only | Existing `update recover` route |
| Restart Runtime after activation | C044 owner injected into C049 | Internal lifecycle detail | Never expose as normal release step |
| Inspect C047 health | C047 health owner injected into C049 | Mandatory production evidence | Consume existing result |
| Capture Runtime/systemd/Nginx identity | Real VPS acceptance probes | Mandatory production evidence | Consume existing probes; no parallel probes |
| Compare protected state | C049 snapshot/evidence contract | Mandatory production evidence | Consume C049 result |
| Persist update evidence | `createReleaseUpdateEvidenceStore` | Mandatory production evidence | Reference, do not copy schema |
| Run C048 baseline acceptance | C048 acceptance owner | Bootstrap/reacceptance only | Exclude from normal per-release rollout |
| Manual `curl`, `systemctl`, file inspection | Existing diagnostic procedures | Diagnostic-only | Keep as exceptional troubleshooting |

## Proposed Operator Workflow

```text
Developer / release operator
  -> Product release facade
     -> C040 build
     -> C041 verify
     -> configured publication owner
  -> Installation facade
     -> Registry-owned Installation resolution
     -> C049 update check
     -> explicit confirmation / dry-run boundary
     -> C049 update
     -> C049 status and evidence reference
     -> existing C047/C044/VPS verification evidence
```

The facade is orchestration only. It must not implement package acquisition,
signature verification, extraction, activation, transaction handling, Runtime
restart, recovery, health inspection or VPS identity probing.

## Public Interface Proposal

Existing website-release commands remain unchanged:

```text
wpsc release build
wpsc release validate
wpsc release recover
```

Proposed Product-release namespace:

```text
wpsc product release build --config <path> --version <semver> [--output-dir <dir>] [--json]
wpsc product release verify --artifact <bundle> --public-key <path> [--json]
wpsc product release publish --config <path> --artifact <bundle> --channel <name> --confirm [--dry-run] [--json]
wpsc product rollout --installation <id> --channel <name> --confirm [--dry-run] [--json]
wpsc product verify-installation --installation <id> [--json]
```

The existing Installation command surface remains authoritative:

```text
wpsc --installation <id> update check --json
wpsc --installation <id> update --json
wpsc --installation <id> update status --json
wpsc --installation <id> update recover --json
```

The current root CLI receives Installation identity through
`WPSC_INSTALLATION_ID`; C050 should normalize the public `--installation <id>`
argument into that existing composition input without hard-coding fixture IDs.

## Genuine Missing Capabilities

1. A production publication owner with atomic staging/commit behavior.
2. Same-version immutable identity conflict detection and identical-repeat idempotency.
3. Publisher concurrency fencing.
4. Reviewed schema-versioned release-operations configuration.
5. A separate redacted C050 orchestration evidence store.
6. Root CLI parsing for an explicit `--installation <id>` argument.
7. A thin rollout command that delegates to C049 and existing verification owners.

## Configuration Proposal

```json
{
  "schema": "wpsc.release-operations",
  "schemaVersion": 1,
  "channels": {
    "production": {
      "artifactBaseUrl": "https://releases.example.com/wpsc/",
      "allowedHosts": ["releases.example.com"],
      "publisher": {
        "type": "filesystem",
        "root": "/srv/wpsc/releases"
      }
    }
  },
  "signing": {
    "publicKeyPath": "/secure/public.pem",
    "privateKeyPathEnvironment": "WPSC_RELEASE_PRIVATE_KEY"
  }
}
```

The private key value and resolved private-key path must never be written into
configuration output, diagnostics or evidence.

## C050 Evidence Proposal

Use a separate `wpsc.release-operations-evidence` schema containing only:

```text
product and version
artifact size and SHA-256
C041 verification reference/result
redacted publication channel/destination
Installation ID when rollout runs
C049 transaction ID and evidence reference
production verification result
protected-state equality result
```

Do not duplicate the full C049 evidence document.

## Implementation Plan

### Phase 2A - Read-only facade and configuration

- Add schema-versioned configuration loader and validator.
- Add Product-release `verify` routing through C041.
- Add Installation argument normalization and read-only check/status/verify routing.
- Add redacted diagnostics and JSON output.

### Phase 2B - Publication owner

- Add an injected filesystem publisher first.
- Require C041 acceptance before publication.
- Implement atomic staging/rename, idempotency, conflict rejection and fencing.
- Add dry-run and explicit production confirmation.

### Phase 2C - Rollout orchestration

- Delegate check/update/status/evidence to C049.
- Never invoke C048 during a normal update.
- Never infer Installation workspace from CWD.

### Phase 3 - Tests

- CWD independence and Installation identity.
- Owner delegation and failure propagation.
- Read-only zero mutation.
- Confirmation and dry-run behavior.
- Atomic/idempotent/conflicting/concurrent publication.
- No C037 fallback for explicit C049 Installation selection.
- C048 exclusion from normal rollout.
- Credential/private-key redaction.

### Phase 4 - Documentation

- Publish the normal operator workflow and exceptional recovery workflow.
- Keep raw VPS inspection commands diagnostic-only.

### Phase 5 - Separately Authorized VPS Validation

- Validate the facade against a non-production test release first.
- Run production publish/update only with separate explicit authorization.

## Final Status

```text
C050-1 Operational Workflow Audit = PASS

Current normal workflow:
C040 build -> C041 verify -> manual/unowned publication -> C049 check/update/status/evidence

Mandatory VPS operations:
Existing C049/C047/C044 identity, health, transaction and protected-state evidence

Exceptional/bootstrap operations:
C048 reacceptance, manual SSH/sudo/filesystem inspection, explicit recovery

Proposed operator facade:
Thin Product release and rollout orchestration over existing owners

Existing owners reused:
C040, C041, Installation Registry, C044, C047, C049 and existing VPS probes

Genuine missing capabilities:
Publication owner, configuration, C050 evidence and public Installation argument normalization

Implementation performed:
Audit and interface design only

Tests:
Not added during audit-only phase

Regression:
Latest trusted C049 closeout: 121/121 PASS

git diff --check:
Pending repository-wide check after implementation

VPS mutation:
NONE

C049 semantics:
UNCHANGED

C048 semantics:
UNCHANGED

Recommended next task:
C050-2A read-only facade and configuration contract

C050 status:
IN PROGRESS

## C050-2A Implementation Note

The read-only foundation is now implemented locally:

```text
framework/src/product/createReleaseOperationsConfiguration.js
framework/src/product/createReadOnlyReleaseOperationsFacade.js
test/c050ReadOnlyReleaseOperations.test.js
```

It validates the versioned credential-safe configuration contract, requires an
explicit registered Installation ID, delegates Product verification to C041,
delegates rollout availability to C049 check only, and reads existing health/
evidence records without returning protected contents. No publisher, updater,
recovery path or VPS operation was added.

Focused C050-2A tests: 6/6 PASS.
```

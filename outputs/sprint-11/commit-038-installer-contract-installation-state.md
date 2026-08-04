# C038 - Installer Contract and Installation State

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C038 defines the Product Deployment Installer control-plane contracts. It does not download Node, extract a Product package, install systemd/Nginx, mutate a Site, or activate a Core release.

## Ownership

- Product Installer owns Installation transaction state, Installation identity, Installation registry, installer-owned infrastructure planning and recovery coordination.
- Product Core Update remains frozen and owns Core release upgrade lifecycle after installation.
- Site Runtime, Site state, credentials, public output and databases remain outside Installer repair ownership.
- Operator-managed Nginx configuration remains operator-owned.

## Transaction Contract

Forward lifecycle:

```text
PLANNING -> PREFLIGHTED -> DOWNLOADING -> VERIFIED -> EXTRACTING
-> BOOTSTRAPPING -> CONFIGURING -> SERVICE_INSTALLING -> HEALTH_CHECK
-> COMPLETED
```

Failure lifecycle:

```text
any non-terminal state -> FAILED -> RECOVERING -> ROLLED_BACK
```

Invalid transitions are rejected. A new transaction cannot replace a non-terminal transaction. Restart inspection returns the deterministic next action from persisted state.

## Atomic Installation State

Persisted state uses schema `wpsc.installation`, schema version `1`, an Installation ID and a monotonically increasing revision. It records workspace, Product/Core/Node versions, active Core, Runtime user and state.

Persistence sequence:

```text
create parent -> exclusive temporary file -> write -> file fsync
-> atomic rename -> directory fsync
```

Executable failure evidence proves a simulated persistence error leaves the previous valid state byte-for-byte unchanged. Temporary/partial files are never selected as authoritative state.

Restart/recovery evidence persists `RECOVERING`, constructs a new service instance, resolves `complete-rollback`, and invokes the injected recovery handler under the transaction's exclusive lock with the stable idempotency key `<transactionId>:recovery`. The first call persists `ROLLED_BACK`; a repeated call returns `alreadyCompleted` without invoking the handler again or changing revision. The executable counter proves one recovery side effect across restart and retry.

## Multi-installation Contract

Resolution precedence is deterministic:

```text
explicit project/workspace
-> explicit Installation ID
-> explicit WPSC environment root
-> registry default Installation
-> installation.selection.required
```

Current working directory is not consulted. Multiple Installation IDs can coexist in one atomic revisioned registry. An absent default never causes an inferred selection.

Registry writes also use a single-writer exclusive lock around read/merge/revision/write. Executable evidence starts with Installations A+B, simulates failure while adding C and proves the registry remains byte-identical A+B. Two overlapping writers serialize through the filesystem lock, both complete successfully, and the second reads the first writer's committed revision before merging. The final registry contains A+B+C+D with no lost update or corrupt JSON. A bounded lock timeout still reports `installation.registry.lock_active` instead of writing concurrently.

Installation identity is immutable after creation. State rejects changes to `installationId` or `workspace`; Registry rejects re-registering an existing Installation ID against a different workspace. Both state and Registry support expected-revision checks and reject stale writers.

## Planner and Privilege Boundary

- Installation plans accept only the declared privileged operation allow-list.
- Dry-run returns the operation plan without invoking any privileged handler.
- The executor rejects unknown operations and missing handlers.
- A persisted transaction deliberately containing `run-arbitrary-command` is read after restart and rejected by the executor. Persisted plans are data, not execution authority.
- C038 does not implement privileged mutations; later commits inject the concrete handlers.

## Repair Contract

Modes are explicitly distinct: `VERIFY`, `REPAIR`, `REINSTALL`, `UPGRADE`.

Repair may restore only:

- global command;
- systemd unit;
- WPSC-managed Nginx config;
- missing mutable directories;
- Installation state.

Repair must not change Core version, Site state, credentials, public output or database state.

Executable sentinel evidence hashes/compares `runtime.env`, Site configuration, Site credentials, public output, database state and `core/active` before and after a repair plan. Every protected value remains byte-identical. Repair also rejects operations such as Node installation that belong to reinstall/upgrade.

## Nginx Contract

WPSC may render a managed config, validate it with `nginx -t`, atomically activate it only after validation, then reload. Operator-managed configuration is not Installer-owned. Validation failure must leave active configuration unchanged; executable activation evidence belongs to the later Nginx implementation commit.

C038 mock-boundary evidence proves failed validation calls neither activation nor reload and leaves the operator-owned active value unchanged. Successful validation preserves the required render -> validate -> activate -> reload order. Filesystem-level Nginx installation remains deferred to its owning later commit.

## Node Policy Contract

The channel is `latest-certified`: choose the newest stable Node release inside WPSC-tested majors. A newer major requires a separate compatibility-test track. Metadata trust, URL allow-listing, redirect policy, checksum verification and safe archive extraction remain mandatory C039-C041 implementation gates.

## Security Boundary

- Installation state and registry contain no credential values or secret fields.
- Serialization tests inject password/token values into state and Registry inputs and prove those values are absent from persisted JSON.
- Failure transition tests inject password/token-bearing error input and prove neither field names nor values reach transaction JSON; only a stable redacted diagnostic is persisted.
- Privileged operations are allow-listed.
- Repair cannot mutate credentials or Site-owned data.
- Recovery declarations accept only Installer-owned artifacts and reject Site state and `core/active` before entering `RECOVERING`.
- Package and Node trust/extraction refinements remain frozen requirements for their owning later commits.

## Stale Writer and Cross-process Evidence

- Two transaction writers start from revision 0; writer A commits revision 1, while writer B's stale revision 0 is rejected without losing writer A's checkpoint.
- Transaction and state writes use filesystem-exclusive locks, not in-memory mutexes.
- Two Installer service instances starting concurrently produce exactly one accepted transaction; the other receives an active-lock/active-transaction diagnostic.
- Registry concurrent writers use the same cross-process single-writer principle and explicit retry behavior.

## Transaction Ownership Fencing

Every transaction persists an `ownerId` and monotonically increasing `fence`. Mutating calls must present both values. When `updatedAt` exceeds the configured stale threshold, restart inspection returns `claim-stale-transaction`. A new process may claim ownership, which increments the fence. Executable evidence proves the previous process is then rejected with `installation.owner.fenced`, while the new owner can continue.

## Crash Consistency for External Mutation

External Installer mutations use a write-ahead intent:

```text
persist activeOperation(INTENT_PERSISTED)
-> execute injected handler with stable idempotency key
-> persist checkpoint and clear activeOperation
```

The crash test deliberately mutates an Installer-owned systemd sentinel and throws before completion persistence. A fresh process sees `recover-external-operation`, reruns the same operation with the same idempotency key, verifies the existing external effect, then clears the intent. The final artifact remains byte-identical and exactly one completed checkpoint is recorded.

## Crash-point Matrix

Fresh service instances inspect persisted state and return deterministic actions:

```text
PLANNING             -> preflight
PREFLIGHTED          -> download
DOWNLOADING          -> verify
VERIFIED             -> extract
EXTRACTING           -> bootstrap
BOOTSTRAPPING        -> configure
CONFIGURING          -> install-services
SERVICE_INSTALLING   -> health-check
HEALTH_CHECK         -> complete
FAILED               -> recover
RECOVERING           -> complete-rollback
```

The matrix is executable restart evidence; it does not rely on in-memory transaction state.

## Dry-run Purity

Dry-run executes the full declared privileged operation set through the executor but invokes zero handlers. Filesystem evidence confirms it creates none of the following:

- Installation state;
- Registry revision;
- temporary Installer directory/files;
- systemd backup;
- Nginx file;
- Node archive/download;
- operation-owned mutation markers.

## Validation

Focused C038:

```text
tests 16
pass 16
fail 0
cancelled 0
```

Evidence covers transaction success/recovery, every crash checkpoint, invalid transitions, cross-process transaction protection, restart from `RECOVERING`, repeat-safe rollback, immutable identity/workspace, stale revision rejection, monotonic revision, state and Registry persistence failure, Registry writer serialization/retry, multi-installation selection, no-CWD inference, zero-mutation dry-run, tampered persisted-plan rejection, missing/unknown handler rejection, repair sentinels, recovery ownership, secret hygiene and Nginx validation ownership.

Repository-wide regression:

```text
tests 627
pass 614
fail 9
cancelled 4
```

The nine failures are existing non-C038 expectations in SEO, incremental assets, commerce publishing, Builder/Theme rendering, Queue and Vietnamese Setup UI. Four C026 Runtime E2E cases reached their existing 30-second timeout under the full concurrent test run. No C038 test failed.

`git diff --check`: PASS

C038 plus frozen Core Update regression:

```text
tests 63
pass 63
fail 0
cancelled 0
```

This confirms the new Installer contracts do not alter the frozen C028-C037 lifecycle.

## Verdict

C038 implementation and all acceptance gates assigned to C038 are complete. Node metadata/download trust, Product package extraction and real systemd/Nginx filesystem activation remain explicitly deferred to their owning later commits. C038 is ready for final audit, but must not be committed or closed until explicitly approved.

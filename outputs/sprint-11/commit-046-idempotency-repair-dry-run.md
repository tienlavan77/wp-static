# C046 - Idempotency, Repair and Dry Run

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C046 composes Installer-owned infrastructure operations into explicit `VERIFY`, `REPAIR` and `REINSTALL` modes. It reuses the C038 operation allow-list and C043-C045 installers rather than creating another infrastructure mutation path.

C046 does not upgrade Core, mutate Site state, reset credentials, rebuild public output or restore databases.

## Mode Contract

### VERIFY

- Runs only injected read-only inspectors.
- Declares no privileged operations.
- Does not write Installation infrastructure.

### REPAIR

May restore only:

- missing mutable directories;
- global `wpsc` command;
- systemd unit;
- WPSC-managed Nginx configuration.

It cannot install another Node version or mutate Core/Site data.

### REINSTALL

Reapplies the verified Installer-owned infrastructure set:

- certified Installation Node;
- required mutable directories;
- global command;
- systemd unit;
- WPSC-managed Nginx configuration.

Existing valid components use their idempotent preservation/backup contracts.

## Dry-run Purity

Dry-run creates the same deterministic operation plan but the privileged executor invokes zero handlers.

Executable evidence hashes the complete Installation workspace before and after dry-run and proves:

- no state file;
- no Registry revision;
- no Node artifact;
- no command;
- no systemd unit/backup;
- no Nginx config/backup/link;
- no temporary Installer file;
- no protected Site/Core artifact

is created or changed.

## Protected-state Guard

C046 snapshots protected state before and after every operation sequence:

- `config/runtime.env`;
- `config/wpsc.json`;
- complete `sites/` tree, including credentials;
- complete `public/` tree;
- configured database sentinel/path;
- `core/active` symlink.

Fingerprints include file size/SHA-256, deterministic directory content and symlink target. A difference returns `installation.maintenance.protected_state_changed` and prevents a successful maintenance verdict.

## Idempotent Reinstall Evidence

The integration fixture wires the real C043 global command, C044 systemd installer and C045 Nginx installer through C046 handlers.

```text
REINSTALL
-> snapshot Installer-owned output
-> REINSTALL again
-> output remains functionally identical
-> protected state remains byte-identical
```

Installer-owned audit backups may accumulate; authoritative command/unit/config content remains deterministic.

## Repair Evidence

After a valid install, the test removes only:

- global command;
- systemd unit;
- managed Nginx config/link.

`REPAIR` recreates those artifacts while preserving Site state, credential values, Product configuration, public output, database content and `core/active`.

## Failure and Retry

The executor stops at the first failing operation. Executable evidence injects a systemd repair failure, proves protected state is unchanged, then retries with the failure removed and completes successfully.

Individual C039/C043/C044/C045 components retain ownership of their own atomic rollback. C038 retains cross-process transaction and crash-recovery ownership.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| Second install safe | Two integrated REINSTALL runs succeed with stable authoritative output |
| Repair safe | Missing owned artifacts restored only |
| Dry-run mutation-free | Whole-workspace hash unchanged and zero handler calls |
| Site state preserved | Site sentinel byte-identical |
| Credentials preserved | Credential sentinel byte-identical |
| Public output preserved | Public sentinel byte-identical |
| Database preserved | Database sentinel byte-identical |
| Active Core preserved | `core/active` target unchanged |
| Failure recovery | Failed repair preserves protected state and later retry succeeds |
| Scope discipline | Unsupported maintenance modes rejected |

## Ownership

- C038 owns planning vocabulary, allow-list, fencing and transaction recovery.
- C039-C045 own each infrastructure artifact implementation.
- C046 coordinates idempotency/repair/dry-run and protected-state verification only.
- Frozen Core Update remains unchanged.

## Validation

Focused C046:

```text
tests 4
pass 4
fail 0
cancelled 0
```

C038-C046, Product Package and frozen Core regression:

```text
tests 112
pass 112
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C046 implementation and acceptance evidence are complete. Reinstall and repair remain limited to Installer-owned infrastructure, dry-run is mutation-free, and protected Site/Core state remains unchanged. It is ready for audit and explicit close.

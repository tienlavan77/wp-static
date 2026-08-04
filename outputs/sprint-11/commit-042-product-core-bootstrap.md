# C042 - Product/Core Bootstrap

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C042 accepts only a C041-verified and extracted production package. It creates the initial immutable Core release, Product configuration, empty Site Registry, mutable infrastructure directories and the first atomic `core/active` pointer.

C042 does not perform Core Update, migration, health rollback, Site provisioning, credential generation or public build output.

## Verified Version Authority

The initial Core version comes exclusively from:

```text
verified.manifest.product.version
```

No hard-coded `1.0.0` fallback is used. The extracted manifest integrity checksum and Product version must match the accepted C041 manifest before bootstrap begins.

Release path:

```text
core/releases/<verified-package.version>
```

The release receives a `.wpsc-staged.json` marker compatible with the frozen Core activation boundary.

## Bootstrap Sequence

```text
require C041 accepted package
-> validate verified Product version
-> create Installer-owned mutable directories
-> validate extracted package identity
-> copy extracted Core into version.bootstrapping
-> write staged Core marker
-> atomic rename into releases/<version>
-> write Product configuration if absent
-> write Installation bootstrap record if absent
-> initialize empty Site Registry if absent
-> create temporary active symlink
-> atomic rename temporary symlink to core/active
```

## Atomic Active Pointer

- The active pointer is a relative symlink: `releases/<verified-version>`.
- The symlink is prepared under a process-specific temporary name.
- Activation uses atomic rename.
- Activation failure leaves `core/active` absent or preserves an existing authoritative pointer.
- Temporary pointer files are removed in `finally`.
- A conflicting existing active Core is rejected without pointer mutation.

## Preservation Boundary

Executable sentinel evidence proves bootstrap does not overwrite:

- existing Site state;
- Site credential files;
- public output;
- database/mutable storage data.

The same sentinels remain byte-identical after both initial bootstrap and idempotent retry.

Existing Product configuration and Installation records are read rather than overwritten. A Product configuration belonging to another version is rejected instead of silently changed.

## Mutable Directories

C042 creates only missing infrastructure directories:

- `config/`;
- `storage/`;
- `storage/logs/`;
- `storage/tmp/`;
- `storage/support-bundles/`;
- `sites/`;
- `core/releases/`.

Recursive directory creation does not delete or reset existing contents.

## Failure Behavior

- Unverified packages are rejected before mutation.
- Invalid verified versions are rejected.
- Extracted/verified identity mismatch is rejected.
- Release staging is cleaned after failure.
- Pointer failure never publishes a partial active pointer.
- A fully copied immutable release may remain recoverable after pointer failure, but it is not active; C038 transaction recovery owns cleanup/resume.
- Existing Site/Core state is never used as rollback scratch space.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| Valid installation created | Product config, Installation record, Registry and Core release present |
| Verified package version used | Core installed under `releases/1.2.3` from manifest |
| Atomic active pointer | `core/active -> releases/1.2.3` |
| Core marker | `.wpsc-staged.json` contains `1.2.3` |
| Site state preserved | Site sentinel byte-identical |
| Credentials preserved | Credential sentinel byte-identical |
| Public output preserved | Public sentinel byte-identical |
| Database preserved | Storage sentinel byte-identical |
| Conflicting active Core | Rejected without pointer mutation |
| Pointer failure | No active or temporary pointer published |
| Retry safety | Second bootstrap preserves mutable state and configuration |

## Ownership

- C041 owns production package verification/extraction.
- C042 owns first Product/Core bootstrap only.
- C043 owns the global `wpsc` command.
- Frozen C035 owns later Core activation semantics during updates.
- C038 owns Installation transaction, fencing and recovery.

## Validation

Focused C042:

```text
tests 4
pass 4
fail 0
cancelled 0
```

C038-C042, Product Package and frozen Core regression:

```text
tests 89
pass 89
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C042 implementation and acceptance evidence are complete. It creates a valid initial Core from the verified package version without overwriting Site-owned state. It is ready for audit and explicit close.

# C039 - Node Distribution Discovery and Verification

Status: IN PROGRESS - service contract tested; production provisioning boundary incomplete

## Scope

C039 owns trusted Node distribution metadata, latest-certified selection, platform artifact selection, SHA-256 verification and atomic installation under the WPSC runtime directory. It does not build or extract the WPSC Product package.

## Certified Release Selection

- Metadata schema: `wpsc.node-distributions` version 1.
- Policy: newest stable semantic version whose major appears in WPSC's certified-major matrix.
- Platform key: explicit `<os>-<architecture>`.
- Unstable releases are excluded.
- Newer untested majors are never selected automatically.
- No compatible stable platform artifact produces a deterministic rejection.

## Trust Boundary

- Metadata final URL must use HTTPS and an allow-listed host.
- Distribution manifest URL must use HTTPS and an allow-listed host.
- Download final URL is checked again, preventing an allowed URL from redirecting to an untrusted host.
- Expected archive size is checked before extraction.
- SHA-256 is checked before extraction.
- Checksum mismatch returns `installation.node.checksum_mismatch`.
- Archive entries are inspected before extraction. Absolute paths, `..` traversal, backslash paths, external symlinks, hardlinks, devices and other special entry types are rejected.
- Only regular files, directories and symlinks resolving inside the package root are accepted.
- The extractor also receives the frozen `node-safe-relative-files-only` path policy.

## Atomic Installation

```text
download
-> verify final URL, size and SHA-256
-> extract into installation-specific staging
-> execute staged Node and verify exact version
-> move current runtime to previous
-> atomically rename staging to runtime/node
-> remove previous runtime
```

On any failure:

- staging is removed;
- an existing runtime is restored if it had already been moved;
- the previous valid runtime remains byte-identical;
- no failed candidate becomes the active Node runtime.

An existing runtime already matching the selected version is preserved without download, extraction or replacement.

## Operational Provisioning Gap

The tested C039 service requires four environment adapters: trusted metadata retrieval, archive download, archive inspection and safe extraction. At this revision no first-party production command binds those adapters and invokes `createNodeDistributionService.install()` for an Installation workspace.

Consequently, the following target prerequisite cannot yet be claimed as executable C039 evidence:

```text
<installation-workspace>/runtime/node/bin/node
```

The older VPS guide's `curl -> tar -> mv` sequence is an operator bootstrap shortcut, not C039 execution: it bypasses the service's archive-entry policy, staged exact-version check and atomic previous-runtime restoration. It must not be used to close C039 or C048.

Required corrective work before C039 can support C048:

1. first-party trusted Node metadata adapter;
2. tar.xz archive inspector that returns entry type and symlink target to C039 policy;
3. safe staging extractor; and
4. an explicit provision command that derives `<workspace>/runtime/node`, reports the selected version and persists no Site/Core state.

## Acceptance Evidence

- Latest compatible stable: selects `26.3.1` from certified majors 20, 22 and 26.
- Untested major: stable `27.0.0` is not selected.
- Unstable release: `26.4.0` is not selected.
- Incompatible matrix: rejected when no certified release exists.
- OS/architecture: `linux-x64` artifact selected deterministically.
- Metadata trust: untrusted metadata origin rejected.
- Redirect trust: untrusted download final URL rejected.
- Checksum: equal-size tampered archive rejected.
- Archive safety: traversal, absolute paths, external symlinks, hardlinks and special files rejected before extraction.
- Version pin: staged executable version must exactly match verified metadata.
- Existing valid Node: preserved without download.
- Pre-activation failure: previous runtime remains intact.
- Activation failure after old runtime move: previous runtime is restored atomically.

## Security Boundary

- No arbitrary distribution URL is accepted.
- A filename is never treated as trust evidence.
- Downloaded bytes are never extracted before URL, size and checksum verification.
- Node release selection cannot cross the certified-major boundary.
- No Site state, credentials, public output, database or Core Update state is read or changed.

## Deferred Boundaries

- C040 owns the WPSC production package dependency/file manifest and signing input.
- C041 owns Product package path traversal, special-file and deterministic extracted-tree enforcement.
- C041 applies the equivalent and broader deterministic-tree policy to WPSC Product packages; Node archive entry enforcement is complete in C039.

## Validation

Focused C039:

```text
tests 8
pass 8
fail 0
cancelled 0
```

`git diff --check`: PASS

C038-C039 plus frozen Core Update regression:

```text
tests 71
pass 71
fail 0
cancelled 0
```

The Node distribution implementation does not alter the frozen C028-C037 lifecycle or the C038 Installer transaction boundary.

## Verdict

C039 service-level implementation covers release discovery, trust selection, compatibility, checksum, safe archive-entry inspection and atomic runtime preservation under injected adapters. Focused service tests remain valid, but C039 is not operationally complete: a target VPS cannot currently execute the contract through a first-party provisioning command. C039 remains `IN PROGRESS`; C048 must remain blocked until the corrective provisioning boundary and its executable evidence are complete.

# C039 - Node Distribution Discovery and Verification

Status: PASS CANDIDATE - production provisioning command and local executable evidence complete; VPS execution pending

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

## Production Provisioning Command

`scripts/c039-provision-node.mjs` is the first-party C039 operational boundary. It binds trusted Node metadata retrieval, HTTPS archive download, tar.xz inspection, staging extraction and the C039 atomic installer. The target is always derived from the explicit workspace:

```text
<installation-workspace>/runtime/node/bin/node
```

It requires root and `--confirm`, reports the selected version and never reads or mutates Site, credential, public-output, database or Core state:

```bash
sudo /path/to/bootstrap-node scripts/c039-provision-node.mjs \
  --workspace /absolute/installation-root \
  --installation production \
  --majors 20,22,26 \
  --confirm
```

The metadata adapter reads `https://nodejs.org/dist/index.json`, limits selection to stable releases in the certified-major matrix and obtains the artifact SHA-256 from the matching official `SHASUMS256.txt`. Archive metadata and final download URLs remain pinned to `https://nodejs.org`. It records tar entry type and symlink target before C039 path policy permits staging extraction.

The older VPS guide's `curl -> tar -> mv` sequence is superseded and must not be used for C039 evidence.

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
tests 10
pass 10
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

C039 now covers release discovery, trust selection, compatibility, checksum, tar.xz type/symlink inspection, safe staging extraction and atomic runtime preservation through a first-party provision command. Focused local evidence is complete. C039 remains a PASS candidate until the command provisions an executable target Node on the C048 VPS/local-VPS target and that evidence is recorded; C048 remains blocked until then.

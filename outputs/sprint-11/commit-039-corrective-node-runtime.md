# C039 Corrective - Installation-Owned Node Runtime Provisioning

Status: PASS / CLOSED

## Objective

This corrective closes the operational gap in C039 without changing its distribution policy or extending C048 into a Node installer. C039 now provisions the Installation-owned runtime at:

```text
<workspace>/runtime/node/bin/node
```

## Implemented Boundary

`scripts/c039-provision-node.mjs` requires root, an absolute workspace and explicit `--confirm`. It binds the C039 service to first-party production adapters:

- trusted Node `index.json` and per-release `SHASUMS256.txt` retrieval from `nodejs.org`;
- stable/certified-major/linux-x64 selection;
- HTTPS final archive URL, byte-size and SHA-256 verification;
- tar.xz type and symlink-target inspection before extraction;
- staging extraction, staged executable/version verification and atomic `runtime/node` activation.

The command snapshots Site configuration, credential-bearing paths, public output, database state and `core/active` before/after. It verifies the activated Node binary is regular, executable, inside the canonical Installation root and exactly matches C039's selected version. A second run must preserve the existing valid runtime.

## Evidence Output

The command atomically persists:

```text
storage/installer/c039-node-provision-evidence.json
```

with schema `wpsc.c039-node-provision` version `1`. It records selected/runtime version, canonical containment, executable state, protected-state equality and idempotent rerun status. It contains no credentials, tokens, secrets or private keys.

The evidence also persists the selected trusted Node artifact URL, byte size and SHA-256. C048 consumes these C039-verified values; it does not accept zero-size or all-zero checksum environment fallbacks.

## Local Validation

```text
C039 service and production-adapter tests
tests 10
pass 10
fail 0
```

`git diff --check`: PASS.

## Target Command

```bash
sudo /trusted/bootstrap/node /path/to/scripts/c039-provision-node.mjs \
  --workspace /absolute/installation-root \
  --installation <installation-id> \
  --majors 20,22,26 \
  --confirm
```

The bootstrap Node runs the provision command only. It is never accepted as the Installation-owned runtime.

## Target Acceptance Evidence

The C039 command ran on the target Installation:

```text
installationId: wpsctest-c048
workspace:      /home/data/sites/production/wpsctest
platform:       linux-x64
selectedVersion: 26.7.0
runtimeVersion:  v26.7.0
```

Persisted `storage/installer/c039-node-provision-evidence.json` reports:

```text
nodeExecutable:           true
versionMatch:             true
runtimeContained:         true
protectedStateUnchanged:  true
idempotentRerun:          true
changed:                  false
preservedOnRerun:         true
status:                   PASS
```

The first execution atomically installed the selected Node; the accepted second execution preserved that valid runtime. C039 is closed and C048 is unblocked.

# C039 Corrective - Installation-Owned Node Runtime Provisioning

Status: PASS CANDIDATE - local contract and command evidence complete; target execution pending

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

## Remaining Acceptance

C039 closes only after the target command yields evidence with `status: PASS`, including an executable contained `runtime/node/bin/node`, exact version match, unchanged protected state and idempotent rerun. Until then C048 remains blocked.

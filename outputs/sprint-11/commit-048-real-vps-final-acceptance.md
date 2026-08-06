# C048 - Install CLI Integration and Initial Production Acceptance

Status: IN PROGRESS - runner and local executable evidence complete; real VPS execution pending

## Objective

C048 exposes the initial Product Installation acceptance flow through one deterministic CLI runner. It does not introduce another installation lifecycle or an update engine: it composes C046 and C047 after the C039 Node prerequisite has been provisioned. It writes one atomic, machine-readable initial-installation verdict. C049 owns Release N -> N+1 self-update; C050 owns the final security/regression audit and C051 owns Installer freeze/close.

## Acceptance Flow

```text
explicit root confirmation
  -> protected-state baseline
  -> C046 REINSTALL dry-run
  -> prove dry-run zero protected mutation
  -> C047 Installer Orchestrator
  -> transaction COMPLETED
  -> C047 Installation Health HEALTHY
  -> global wpsc probe
  -> systemd probe
  -> Runtime readiness probe
  -> Nginx validation/domain probe
  -> C046 VERIFY
  -> protected-state post-check
  -> atomic PASS evidence
```

## Real VPS Runner

Runner:

```text
scripts/c048-vps-installer-acceptance.js
```

Required invocation from the harness, with an explicit fresh Installation target:

```bash
sudo runtime/node/bin/node \
  scripts/c048-vps-installer-acceptance.js \
  --workspace /home/data/sites/production/wpsctest \
  --confirm
```

The runner requires UID 0, explicit `--confirm` and an explicit target `--workspace`. It resolves the harness from its own installed location and never silently uses the harness as the Installation target. The target must be absolute, existing, distinct from the harness and write evidence under its own `storage/installer/` directory.

C039 is an explicit prerequisite: before C048 starts any dry-run or installation lifecycle, `runtime/node/bin/node` must exist in the target and be executable. C048 does not download or provision Node; that remains C039 ownership.

The package acquisition endpoint can be started with `scripts/c048-local-release-https.mjs`. It serves one immutable bundle over HTTPS and does not perform signing or package verification. The certificate must cover the configured test hostname/IP; the private signing key is never used by this server.

The environment-specific composition root is fixed inside the target at:

```text
config/c048-installer-runtime.mjs
```

The runner canonicalizes both target workspace and composition-module paths and rejects a symlink or path that resolves outside the exact Installation-owned config location. The composition module receives both `{ harnessWorkspace, workspace }`: it imports the first-party factory from the temporary harness and installs only into the target. Release credentials, signing trust material and deployment-specific values remain outside Git.

## Required Composition Contract

The default export is an async factory. Production composition must construct probes with `createRealVpsAcceptanceProbes`; plain functions returning `{ ok: true }` are rejected by the VPS runner:

```js
export default async function createC048Runtime({ harnessWorkspace, workspace }) {
  const probes = createRealVpsAcceptanceProbes({
    domain: "shop.example.com",
    installationId: "production",
    runtimeUrl: "http://127.0.0.1:8787/health",
    workspace
  });
  return {
    installer,
    maintenance,
    health,
    probes,
    databaseFingerprint,
    input: {
      installationId: "production",
      ownerId: "c048-vps",
      installation: {},
      maintenance: {},
      health: {}
    }
  };
}
```

The factory configures adapters only. Transaction/lifecycle decisions remain in C038/C047.

The VPS runner enables `requireRealProbes`. Each accepted probe carries an internal marker applied by `createRealVpsAcceptanceProbes`, preventing an accidental placeholder such as `async () => ({ ok: true })` from generating production PASS evidence.

`createC048VpsRuntime` is the first-party composition factory. It wires the real C039-C047 owners, Installation Registry/State, Site Registry repository, global command, systemd, Nginx, health and acceptance probes. The VPS config therefore contains deployment values only; it does not construct Installer business logic.

A copy-ready template is provided at:

```text
scripts/c048-installer-runtime.example.mjs
```

It is copied to `config/c048-installer-runtime.mjs` on the VPS and reads package/domain metadata from environment variables.

## Protected-State Integrity

C048 owns the acceptance snapshot implementation instead of trusting the environment adapter to report its own integrity.

The following aggregates are hashed without printing their contents:

- Site configuration;
- credential-bearing files and `runtime.env`;
- public output;
- database state.

Each aggregate uses deterministic path ordering, file size and SHA-256 content fingerprints. Missing paths are represented explicitly as `absent`, which differs from an empty directory fingerprint. Credential values are never included in console output or evidence.

Real VPS composition must provide `databaseFingerprint()`. It must inspect the actual production database through an environment-appropriate read-only mechanism and return one lowercase SHA-256 digest. The runner rejects a missing function or malformed digest. A test sentinel is not accepted as the VPS database contract.

`scripts/c048-database-fingerprint.js` fingerprints the configured real database file/directory, including deterministic missing-state identity. Tests prove missing, version 1 and version 2 produce three different SHA-256 digests.

## Production Transport Bundle

`scripts/build-c048-production-bundle.js` converts an already signed C040 Production Package directory into the transport schema consumed by C047 Package Acquisition. It emits exact version, byte size and SHA-256 metadata for release publication. It refuses unsigned input, unsafe symlinks and replacement of an existing immutable output.

Executable evidence proves the complete handoff:

```text
signed C040 package
  -> C048 transport bundle
  -> C047 acquisition
  -> C041 real signature verification
  -> accepted
```

Private signing keys remain release-side only. The bundler does not sign packages and must not run on the VPS with a private key.

C048 compares baseline against both post-dry-run and final post-install state. Any difference prevents PASS with `installation.acceptance.protected_state_changed`.

## Mandatory VPS Probes

All four probes are required and must return `{ ok: true }`:

| Probe | Acceptance meaning |
| --- | --- |
| `global-command` | Installed global `wpsc` resolves the selected Installation |
| `systemd` | Installation-specific unit is active as `www-data:www-data` and ExecStart uses Installation Node plus `core/active` CLI |
| `runtime` | Runtime process answers its real readiness endpoint |
| `nginx` | `nginx -t` passes and a real request to the configured domain succeeds |

A missing or failed probe blocks acceptance. Probe details are recursively redacted for password, token, secret, credential and private-key fields before persistence.

## Evidence

Successful real execution atomically writes:

```text
storage/installer/c048-vps-evidence.json
```

Schema:

```text
wpsc.c048-vps-acceptance / schemaVersion 1
```

Required PASS fields include:

- exact workspace;
- Installation ID and transaction ID;
- `COMPLETED` lifecycle;
- `HEALTHY` health state and report path;
- Node version used by the runner;
- all four probe results;
- dry-run and VERIFY results;
- baseline and after hashes;
- completion timestamp;
- explicit `status: PASS`.

Persistence reuses the C038 atomic JSON store: temporary write, file fsync, atomic rename and directory fsync.

## Failure Semantics

C048 cannot emit PASS when:

- `--confirm` is absent;
- the runner is not root;
- the fixed composition module is missing or escapes the workspace;
- C046 dry-run fails or mutates protected state;
- C047 does not reach `COMPLETED`;
- health is not `HEALTHY`;
- a mandatory probe is absent or fails;
- a placeholder/non-production probe is supplied;
- real database fingerprinting is absent or malformed;
- C046 VERIFY fails;
- Site, credentials, public output or database hashes change.

C048 does not repair or roll back these failures. C038 owns transaction recovery and C046 owns repair. C048 reports acceptance only.

## Local Executable Evidence

Focused tests prove:

- complete happy-path evidence is atomically persisted;
- exact operation/probe order is enforced;
- confirmation is required before any call;
- unhealthy Runtime blocks acceptance;
- a missing mandatory probe blocks acceptance;
- probe secrets are redacted;
- Site configuration mutation blocks PASS;
- credential mutation blocks PASS;
- public output mutation blocks PASS;
- database mutation blocks PASS.
- placeholder `ok: true` probes are rejected in production mode;
- global `wpsc --installation <id> --version` is executed;
- systemd unit, user, group, Node and active-Core CLI identity are verified;
- Runtime and configured domain receive real requests;
- malformed database fingerprints are rejected.

Focused C048:

```text
tests 13
pass 13
fail 0
cancelled 0
```

The focused set covers target/Node prerequisite parsing, first-party composition, database fingerprinting, acceptance ordering, real-probe enforcement, protected-state preservation and C040 transport handoff.

C028-C048 Core Update, Installer and Product Package regression:

```text
tests 142
pass 142
fail 0
cancelled 0
```

`git diff --check`: PASS.

## Real VPS Acceptance Matrix

| Gate | Current status |
| --- | --- |
| Runner implementation | PASS |
| Root/confirmation boundary | PASS |
| Fixed composition path containment | PASS |
| Atomic evidence persistence | PASS |
| Protected snapshot implementation | PASS |
| Local failure-path evidence | PASS |
| Placeholder probe rejection | PASS |
| Real probe implementation | PASS |
| Database fingerprint contract | PASS |
| First-party VPS composition | PASS |
| Deployment-only config template | PASS |
| Production transport bundler | PASS |
| Bundle -> acquisition -> C041 handoff | PASS |
| Harness/target separation | PASS |
| Full local regression | PASS - 142/142 |
| Real production package acquisition | PENDING VPS |
| Real C047 lifecycle `COMPLETED` | PENDING VPS |
| Real global `wpsc` | PENDING VPS |
| Real systemd/www-data Runtime | PENDING VPS |
| Real Runtime readiness | PENDING VPS |
| Real Nginx/domain route | PENDING VPS |
| Real protected hashes unchanged | PENDING VPS |
| `c048-vps-evidence.json` status PASS | PENDING VPS |

## Changed Files

```text
framework/src/product/installer/createProductInstallerAcceptanceService.js
framework/src/product/installer/createRealVpsAcceptanceProbes.js
framework/src/product/installer/createC048VpsRuntime.js
framework/src/product/package/createProductionPackageBundle.js
framework/src/index.js
scripts/c048-vps-installer-acceptance.js
scripts/c048-database-fingerprint.js
scripts/c048-installer-runtime.example.mjs
scripts/build-c048-production-bundle.js
scripts/c048-local-release-https.mjs
test/productInstallerAcceptanceService.test.js
test/realVpsAcceptanceProbes.test.js
test/c048VpsRuntime.test.js
test/productionPackageBundle.test.js
outputs/sprint-11/commit-048-real-vps-final-acceptance.md
```

## Verdict

C048 implementation and local evidence are complete, but C048 is not a PASS candidate yet because its defining real VPS execution has not run. The next action is to create the Installation-owned `config/c048-installer-runtime.mjs` composition for the target VPS and execute the confirmed runner. Only a valid `storage/installer/c048-vps-evidence.json` with all real probes and protected hashes green can close C048 and freeze the Product Deployment Installer sprint.

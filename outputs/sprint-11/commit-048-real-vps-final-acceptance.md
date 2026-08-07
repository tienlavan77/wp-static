# C048 - Install CLI Integration and Initial Production Acceptance

Status: IN PROGRESS - local implementation complete; target composition readiness and initial acceptance pending

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
sudo /absolute/installation-root/runtime/node/bin/node \
  /path/to/harness/scripts/c048-vps-installer-acceptance.js \
  --workspace /home/data/sites/production/wpsctest \
  --confirm
```

The runner requires UID 0, explicit `--confirm` and an explicit target `--workspace`. It resolves the harness from its own installed location and never silently uses the harness as the Installation target. The target must be absolute, existing, distinct from the harness and write evidence under its own `storage/installer/` directory.

C039 is an explicit prerequisite: before C048 starts any dry-run or installation lifecycle, `runtime/node/bin/node` must exist in the target and be executable. The runner must itself execute through that exact Installation-owned Node, not a harness or system Node. C048 does not download or provision Node; that remains C039 ownership.

The target composition reads the C039 PASS evidence for the same workspace and requires its selected artifact URL, size and SHA-256. `WPSC_NODE_SIZE=0` and an all-zero SHA-256 are never accepted as production C048 Node identity.

For an Installation-owned clean target, C042 bootstrap creates an empty operator-managed `config/runtime.env` and an absent-only `runtime.config.js` that imports Runtime adapters through `core/active`. C048 preserves any existing operator configuration; C044 systemd therefore receives its required Runtime files only after C042 has published the initial Core.

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

## Target Composition Readiness Audit

The C048 target is fixed for the initial acceptance run:

```text
installationId: wpsctest-c048
workspace:      /home/data/sites/production/wpsctest
domain:         wpsctest.local
domain URL:     http://wpsctest.local/
runtime:        127.0.0.1:8787
```

The target-owned composition file is:

```text
/home/data/sites/production/wpsctest/config/c048-installer-runtime.mjs
```

It receives `harnessWorkspace` only to import the reviewed first-party composition factory. It must pass the exact target `workspace` to `createC048VpsRuntime`; Product state, Node runtime, Core, installer transaction, output and evidence remain target-owned. The runner canonicalizes the target config path and rejects a composition file outside `workspace/config/`.

Before invoking C048, all gates below must be satisfied:

| Gate | Required evidence | Current state |
| --- | --- | --- |
| C039 runtime | Target Node executable and exact version | PASS: `v26.7.0` |
| C039 artifact identity | Evidence contains trusted URL, size and SHA-256 | PENDING evidence refresh after C039 identity binding |
| Runner authority | Process executable equals target `runtime/node/bin/node` | PASS local; PENDING target invocation |
| Package trust | Public key, version, HTTPS URL, size and SHA-256 configured | PENDING target configuration audit |
| Package transport | HTTPS endpoint returns the immutable C040/C048 bundle | PENDING target probe |
| Domain probe | Explicit HTTP URL because test Nginx has no TLS contract | PENDING target probe |
| Database fingerprint | Path identifies actual target database without exposing values | PENDING target configuration audit |

`WPSC_NODE_SIZE=0` and an all-zero Node checksum are rejected by the target composition. C048 reads Node artifact identity only from C039 PASS evidence for the same workspace. This prevents a pre-existing Node binary from silently satisfying an unverified C048 Node configuration.

The required target environment values are:

```text
WPSC_INSTALLATION_ID=wpsctest-c048
WPSC_DOMAIN=wpsctest.local
WPSC_DOMAIN_URL=http://wpsctest.local/
WPSC_RUNTIME_PORT=8787
WPSC_PACKAGE_VERSION=1.0.0
WPSC_PACKAGE_URL=https://wpsctest.local:9443/wpsc-1.0.0.bundle.json
WPSC_PACKAGE_SIZE=2352445
WPSC_PACKAGE_SHA256=bd4fb8d3685062234a209277df6d7388d65f67ab0807ed3fb4056a528336a2df
WPSC_PACKAGE_PUBLIC_KEY=/home/data/sites/production/wpsctest/config/product-package-public.pem
WPSC_DATABASE_PATH=/home/data/sites/production/wpsctest/storage/data.db
NODE_EXTRA_CA_CERTS=/home/data/sites/production/c048-release/tls/wpsctest.local-cert.pem
```

No private signing key, Site credential or runtime secret is supplied to the composition or acceptance evidence.

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
tests 14
pass 14
fail 0
cancelled 0
```

The focused set covers target/Node prerequisite parsing, target-owned runner enforcement, first-party composition, database fingerprinting, acceptance ordering, real-probe enforcement, protected-state preservation and C040 transport handoff.

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
| Real production package acquisition | PASS - signed `1.0.0` transport consumed |
| Real C047 lifecycle `COMPLETED` | PASS - transaction `install-1786097568173` |
| Real global `wpsc` | PASS - `/usr/local/bin/wpsc`, version `1.0.0` |
| Real systemd/www-data Runtime | PASS - `wpsc-runtime-wpsctest-c048.service` |
| Real Runtime readiness | PASS - target Runtime probe returned `404` within accepted readiness contract |
| Real Nginx/domain route | PASS - `http://wpsctest.local/`, `404` within accepted route contract |
| Real protected hashes unchanged | PASS - credentials, database, public output, Site configuration equal before/after |
| `c048-vps-evidence.json` status PASS | PASS - 2026-08-07T10:12:59.453Z |

## Real VPS Evidence

The confirmed target run used the Installation Node `v26.7.0`, canonical harness `/home/data/sites/wp-static`, target workspace `/home/data/sites/production/wpsctest`, and target-owned composition `config/c048-installer-runtime.mjs`.

`storage/installer/c048-vps-evidence.json` reports `status: PASS` with:

- C046 `REINSTALL` dry-run: PASS with zero protected-state change.
- C047 transaction: `COMPLETED`; installation ID `wpsctest-c048`.
- C047 health: `HEALTHY`.
- C043 global command: PASS.
- C044 systemd: active as `www-data:www-data`, target Node and target `core/active` CLI, `WPSC_INSTALLATION_ID=wpsctest-c048`.
- C045 Nginx/domain probe: PASS.
- C046 `VERIFY`: PASS.
- Protected credentials, database, public output and Site configuration hashes: unchanged.

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

C048 real VPS acceptance is PASS. The canonical harness, Installation-owned Node, target composition, C047 lifecycle, C043/C044/C045 probes, C046 verification and protected-state equality all have real executable evidence. C048 is closed subject to the project's final C049-C051 release/self-update, security audit and freeze sequence.

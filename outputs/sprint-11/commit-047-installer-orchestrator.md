# C047 - Installer Orchestrator

Status: PASS CANDIDATE - awaiting audit and explicit close

## Objective

C047 composes the C038-C046 Installer services into one durable Product Installation lifecycle. It also owns the final Installation health matrix and human-readable report used to decide whether the transaction may reach `COMPLETED`.

C047 does not perform real VPS acceptance; C048 owns that work.

## Lifecycle

```text
PLANNING
  -> PREFLIGHTED
  -> DOWNLOADING
  -> VERIFIED
  -> EXTRACTING
  -> BOOTSTRAPPING
  -> CONFIGURING
  -> SERVICE_INSTALLING
  -> HEALTH_CHECK
  -> COMPLETED

any orchestrated failure
  -> FAILED
```

The orchestrator delegates durable state, revision, fencing, locking, external-operation intent and recovery boundaries to the C038 Installation Transaction Service. It does not create a second transaction system.

## Explicit Recovery Before Retry

A `FAILED` transaction is intentionally not retried by `install()` and cannot be bypassed by starting another transaction. The explicit `recover()` boundary transitions only Installer-owned resources through:

```text
FAILED -> RECOVERING -> ROLLED_BACK
```

Recovery is repeat-safe after `ROLLED_BACK`. Only then may a new transaction claim the workspace with a new owner/fence. Focused evidence injects a Node failure, proves a retry is rejected while the transaction is `FAILED`, recovers it once, repeats recovery without mutation, and completes a new Installation transaction. Site, credential, public, database and Core boundaries remain outside recovery scope.

## Component Ownership

| Phase | Owner invoked by C047 |
| --- | --- |
| Preflight | Injected Installer preflight boundary |
| Node | C039 Node Distribution Service |
| Production package acquisition | C047 Production Package Acquisition Service |
| Package verification/extraction | C041 Production Package Verifier |
| Product/Core bootstrap | C042 Product/Core Bootstrap Service |
| Global command | C043 Global WPSC Command Service |
| systemd | C044 Runtime Service Installer |
| Nginx | C045 Nginx Installer |
| Final health/report | C047 Installation Health Service |

The constructor rejects a missing component or handler. Persisted operation types remain the fixed C038 allow-list handlers registered in process; transaction JSON cannot resolve or execute arbitrary commands.

## DOWNLOADING Ownership

`DOWNLOADING` has an executable owner. C047 acquires the Production package before C041 verification through `createProductionPackageAcquisitionService`.

The acquisition contract requires:

- an HTTPS URL whose hostname is in the configured release allow-list;
- the expected Product ID and exact version;
- the expected transport byte size and SHA-256;
- a deterministic Installation-owned target directory;
- a fixed JSON transport bundle schema;
- safe relative file, directory and symlink entries only.

Both the requested URL and the download adapter's final response URL are checked, preventing an allowed source from redirecting to an untrusted host. Credentials embedded in URLs are rejected.

The downloader verifies transport size and SHA-256, then validates bundle identity and paths before materializing any entry. It writes into:

```text
<target>.downloading-<installationId>
```

and atomically renames the complete directory into place. Failure removes staging and leaves no usable package target. An immutable acquisition marker makes retry idempotent; the same identity returns the existing package without another download, while a conflicting identity is rejected.

This transport checksum is an acquisition/handoff boundary only. C047 does not treat it as package authenticity. C041 remains the sole owner of signed manifest, exact tree and compatibility verification before extraction.

## Deterministic Data Flow

Package verification happens before extraction. The verified manifest is supplied to extraction, and the same package is verified before bootstrap. The extraction target is passed explicitly to Product/Core bootstrap, so callers cannot accidentally bootstrap an unrelated directory.

External mutations are persisted as intent before execution:

```text
transaction intent + idempotency key
  -> component operation
  -> completed-operation checkpoint
```

The operation IDs are stable: `node`, `package-download`, `package`, `core`, `global-command`, `systemd`, `nginx`, and `health`.

## Restart and Resume

Executable tests restart the orchestrator from:

- `DOWNLOADING`;
- `EXTRACTING`;
- `BOOTSTRAPPING`;
- `SERVICE_INSTALLING`;
- `HEALTH_CHECK`.

Completed phases are not replayed. A simulated process interruption after external-operation intent persistence leaves `activeOperation` durable. A new orchestrator instance resumes that exact operation with the same transaction/operation idempotency key, clears the intent only after success, and reaches `COMPLETED`.

Package acquisition has dedicated restart evidence: Node has already completed, `package-download` intent is persisted, the downloader is interrupted, and the restarted orchestrator resumes `package-download` with the same idempotency key before package verification. Node is not replayed and verification cannot run against a partial download.

`FAILED`, `RECOVERING`, `ROLLED_BACK`, and `COMPLETED` are terminal from the orchestrator's forward-execution perspective. C047 does not silently continue a failed transaction and does not take over C038 recovery ownership.

## Health Acceptance

The required final matrix contains:

```text
installation-state
registry
node
core
global-command
systemd
runtime
nginx
```

States are explicit:

```text
all checks pass                         -> HEALTHY
only non-critical checks fail          -> DEGRADED
one or more critical checks fail       -> FAILED
```

Only `HEALTHY` may advance the Installation transaction to `COMPLETED`. `DEGRADED` and `FAILED` health stop the lifecycle and persist transaction state `FAILED`.

Health evidence is persisted atomically at:

```text
storage/installer/health.json
storage/installer/reports/installation-health.md
```

## Failure and Secret Boundary

Failure persistence records a stable error code and a redacted diagnostic message. Component exception text and credential-bearing health details are not copied into transaction or health state.

Executable evidence injects a secret token into a failed health response and proves the value is absent from persisted transaction bytes.

## Isolation Evidence

A failure scenario hashes and compares sentinel data representing:

- Site configuration;
- credentials;
- public output;
- database state;
- active Core state.

All remain byte-identical after the orchestrated systemd failure. Independent production and staging workspaces run concurrently and persist separate Installation IDs and transaction files.

## Acceptance Matrix

| Gate | Result | Executable evidence |
| --- | --- | --- |
| Complete lifecycle | PASS | Clean install reaches `COMPLETED` |
| Deterministic component order | PASS | Exact ordered call list asserted |
| DOWNLOADING owner | PASS | C047 Package Acquisition runs before C041 verification |
| Trusted source policy | PASS | HTTPS allow-list and final redirect URL enforced |
| Artifact identity | PASS | Product ID, version, size and SHA-256 required |
| Atomic download staging | PASS | Temporary directory atomically renamed on completion |
| No partial package | PASS | Failure removes target and staging directories |
| Download idempotency | PASS | Matching acquisition marker prevents redownload |
| Download restart | PASS | Persisted `package-download` intent resumes with same key |
| Unsafe bundle rejection | PASS | Traversal and unsafe symlink paths rejected |
| Verification ownership | PASS | Downloader does not verify signature; C041 remains authoritative |
| Real C041 handoff | PASS | Acquired signed artifact accepted by real C041 verifier |
| Package-to-bootstrap binding | PASS | Verified extraction target asserted at bootstrap |
| Durable checkpoints | PASS | All seven mutation operation IDs persisted |
| Restart from lifecycle states | PASS | Five checkpoint restart scenarios |
| Interrupted operation resume | PASS | Intent survives crash and operation replays once |
| Same idempotency identity | PASS | Stable transaction ID and operation ID used on replay |
| Failure transition | PASS | Component/health failures persist `FAILED` |
| No silent failed resume | PASS | Resume returns `FAILED` without further execution |
| Explicit failed recovery | PASS | `FAILED -> RECOVERING -> ROLLED_BACK` before a new retry |
| Recovery idempotency | PASS | Repeated recovery after `ROLLED_BACK` is a no-op |
| Health gate | PASS | Only `HEALTHY` reaches `COMPLETED` |
| Secret hygiene | PASS | Injected secret absent from transaction bytes |
| Site/Core isolation | PASS | Five protected sentinels remain byte-identical |
| Multi-installation isolation | PASS | Concurrent workspaces remain independent |
| C038 ownership preserved | PASS | Real Transaction Service used for state/fencing/intent |
| C048 boundary preserved | PASS | No real VPS provisioning or mutation in C047 |

## Validation

Focused C047 health and orchestrator tests:

```text
tests 13
pass 13
fail 0
cancelled 0
```

The focused validation consists of `test/productInstallerOrchestrator.test.js` (8 tests) and `test/installationHealthService.test.js` (5 tests). The explicit recovery/retry test is included in the orchestrator suite.

C028-C047 Core Update, Installer, Product Package regression:

```text
tests 128
pass 128
fail 0
cancelled 0
```

`git diff --check`: PASS.

## Changed Files

```text
framework/src/product/installer/createInstallationHealthService.js
framework/src/product/installer/createProductInstallerOrchestrator.js
framework/src/product/installer/createProductionPackageAcquisitionService.js
framework/src/product/package/createProductionPackageVerifier.js
framework/src/index.js
test/installationHealthService.test.js
test/productInstallerOrchestrator.test.js
test/productionPackageAcquisitionService.test.js
outputs/sprint-11/commit-047-installer-orchestrator.md
```

## Verdict

C047 implementation is complete and is a PASS candidate. `DOWNLOADING` now has a real Package Acquisition owner with trusted-source, identity, atomicity, no-partial-artifact and retry/restart evidence. The Installer lifecycle is durably coordinated through the existing C038 transaction contract, resumes deterministically, stops on failure, accepts only healthy output, preserves protected state, and emits machine-readable plus human-readable health evidence. A failed transaction now has an explicit, repeat-safe recovery boundary before any new Installation transaction is allowed to claim the workspace.

C047 is not committed or marked closed until explicit audit approval. C048 remains pending.

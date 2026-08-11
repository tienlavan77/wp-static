# C050-3C Development Installation Rollout Validation

## Verdict

```text
C050-3C = PASS
Installation: wpsctest-c048
Release transition: 1.1.0 -> 1.2.0
Mutation owner: C049
Transaction: release-update-1786439090214
Transaction state: COMPLETED
```

The task stopped after successful C050 Installation verification. No later
phase was started.

## Authorized Boundary

The only authorized Installation mutation was:

```text
C050 product rollout --installation wpsctest-c048 --channel development --confirm
-> C049 check/update/status
-> C050 product verify-installation
```

The first rollout used the canonical reviewed C050 CLI from
`/home/data/sites/wp-static` because active Release `1.1.0` predates the C050
commands. The command still delegated all lifecycle mutation to the
Installation-owned C049 composition. After activation, global WPSC reports
`1.2.0` and contains the C050 command surface.

## Preflight

Read-only dry-run resolved the explicit Registry-owned Installation:

```text
installationId: wpsctest-c048
workspace: /home/data/sites/production/wpsctest
channel: development
currentVersion: 1.1.0
availableVersion: 1.2.0
status: UPDATE_AVAILABLE
mutation: NONE
```

Target identity:

```text
productId: wpsc
version: 1.2.0
compatible: true
minNodeMajor: 26
size: 2482947
sha256: c618b1f17f6f913b912e6846a4161f3ea3a40c026e040040c2468d1e6e316af0
url: https://wpsc.local/1.2.0/wpsc-1.2.0.bundle.json
```

The C049 Installation catalog was updated from the retired historical
`wpsctest.local:9443` entry to the already-published immutable development
Release `1.2.0`. `installation-state.json` remained at `1.1.0` until C049
performed the rollout.

## Registry Cleanup

Before rollout, a stale Registry identity was removed:

```text
removed Installation: wpsctest
removed workspace mapping: /home/data/sites/production/wp-static
defaultInstallation: wpsctest-c048
authoritative workspace: /home/data/sites/production/wpsctest
Registry revision: 28
```

The global WPSC command was regenerated through the existing official owner.
The inactive and disabled legacy `wpsc-runtime.service` unit, which referenced
the absent retired workspace, was removed. The authoritative
`wpsc-runtime-wpsctest-c048.service` remained active throughout cleanup.

Final active-path audit found no reference to
`/home/data/sites/production/wp-static` in Registry, global command, systemd,
Nginx or Installation configuration.

## C049 Rollout

C050 delegated the confirmed mutation to C049:

```text
ok: true
mutation: C049
status: PASS
finalVersion: 1.2.0
transactionId: release-update-1786439090214
evidence schema: wpsc.c049-self-update
evidence status: PASS
```

C049 completed every authoritative lifecycle phase:

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
```

Final transaction state:

```text
state: COMPLETED
revision: 23
activeOperation: null
lastError: null
recovery: null
currentVersion: 1.1.0
targetVersion: 1.2.0
```

## Installation Verification

Identity gates:

```text
active pointer: releases/1.2.0
global wpsc: 1.2.0
Runtime x-wpsc-product: wpsc
Runtime x-wpsc-release: 1.2.0
Nginx x-wpsc-product: wpsc
Nginx x-wpsc-release: 1.2.0
```

The Runtime and Nginx endpoints returned HTTP 404 with the correct identity
headers. The 404 response is valid product/release identity evidence and does
not represent a failed health gate.

Systemd:

```text
unit: wpsc-runtime-wpsctest-c048.service
active: true
enabled: true
ActiveState: active
SubState: running
MainPID: 2680880
ExecMainStatus: 0
```

C047 health:

```text
schema: wpsc.installation-health
state: HEALTHY
activeCore: releases/1.2.0
coreVersion: 1.2.0
productVersion: 1.2.0
critical checks: all PASS
```

C050 verification:

```text
ok: true
installationId: wpsctest-c048
health.state: HEALTHY
evidence.schema: wpsc.c049-self-update
evidence.status: PASS
evidence.transactionId: release-update-1786439090214
mutation: NONE
```

## Protected State

C049 before/after protected-state comparisons:

```text
credentials: true
database: true
publicOutput: true
siteConfiguration: true
```

Only equality results are recorded in C050 evidence. Protected hashes and
protected Installation contents are not duplicated.

## Rollback Material

Retained Core Releases:

```text
1.0.0
1.1.0
1.2.0
```

The previous active Release `1.1.0` remains present as rollback material. No
manual rollback was requested or performed.

## Safety

```text
C048: NOT RUN
manual filesystem copy: NONE
manual Core activation: NONE
manual Runtime restart: NONE
manual systemd restart: NONE
direct wpsc update: NOT RUN
direct publication: NOT RUN
manual rollback: NOT RUN
retired production/wp-static active references: NONE
C049 semantics: UNCHANGED
C048 semantics: UNCHANGED
```

Runtime restart, activation, health and transaction behavior were performed
only inside the authoritative C049 lifecycle.

## Evidence

```text
outputs/sprint-11/c050-3c-development-rollout-evidence.json
schema: wpsc.c050-rollout-evidence
schemaVersion: 1
```

The C050 evidence is a concise redacted orchestration record and references,
rather than duplicates, the authoritative C049 evidence.

## Tests

Focused tests relevant to the C050 rollout and C049 delegation path terminated
naturally:

```text
test/c050ProductRolloutFacade.test.js: 4/4 PASS
test/c050RootCliWiring.test.js: 4/4 PASS
test/c050LocalE2E.test.js: 3/3 PASS
test/releaseUpdateService.test.js: 9/9 PASS
test/c049ReleaseUpdateRuntime.test.js + test/c049ProductionComposition.test.js: 8/8 PASS
total: 28/28 PASS
fail: 0
cancelled: 0
skipped: 0
git diff --check: PASS
```

No unrelated repository-wide regression suite was run.

## Final State

```text
C050-3B publication: PASS
C050-3C rollout: PASS
Installation active Release: 1.2.0
Global WPSC: 1.2.0
Runtime identity: 1.2.0
Nginx identity: 1.2.0
C047 health: HEALTHY
C049 transaction: COMPLETED
C049 evidence: PASS
C050 verification: PASS
Previous Release 1.1.0 retained: YES
Protected-state equality: PASS

C050-3C = PASS
```

The next phase, if separately authorized, is C050-4 Final Operational Workflow
Audit. It was not started by this task.

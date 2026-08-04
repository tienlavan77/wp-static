# Core Update C037 - Real VPS E2E and Architecture Freeze

## Status

**PASS / CLOSED.**

C037 completed local and real-VPS acceptance. Core Update Architecture is frozen after C028-C037. Future changes must be limited to bug, security and maintenance work unless a new architecture process explicitly reopens the lifecycle.

## Implementation

- Added the Product Update coordinator that composes Release Discovery, Planner, Package Verification, Lifecycle, Recovery, Staging, Product Migration, Configuration Validation, Atomic Activation and Health/Rollback.
- Connected the root `wpsc` CLI production composition to the coordinator instead of the former release-discovery-only service.
- Added the local signed-package layout used by production composition:
  - `storage/core-releases/releases.json`
  - `storage/core-releases/<packageId>/manifest.json`
  - `storage/core-releases/<packageId>/package.bin`
  - `storage/core-releases/<packageId>/core/`
  - `config/core-update-public.pem`
- Preserved the trust boundary: only an Ed25519 public key is read by the VPS. Signing material is never accepted or persisted by Product Update.
- Fixed staging inspection so `core/active` can be the frozen C035 symlink contract instead of the retired regular-file pointer.
- Changed generated Runtime ownership so systemd executes `core/active/framework/src/cli/index.js`; activation and rollback now change the Core that a restarted Runtime actually executes.
- Added deterministic Core tree serialization. The Ed25519 signature now binds the exact staged file tree, and staging rejects a copied tree that differs from verified package content.
- Added a guarded VPS acceptance runner that backs up systemd, runs updates as `www-data`, restarts Runtime, checks the active release and compares isolation hashes.

## Executable Scenario Evidence

The C037 E2E uses real Core Update services, a real Ed25519 signed package, real filesystem staging, real recovery snapshots, real atomic symlink activation and real health-triggered rollback.

### Scenario 1 - Normal Update

```text
core/active -> releases/1.0.0
signed wpsc-1.1.0 package
CLI check -> plan -> update -> status -> history
core/active -> releases/1.1.0
lifecycle -> COMPLETED
```

Result: **PASS**.

### Scenario 2 - Broken Release

```text
core/active -> releases/1.1.0
signed wpsc-1.2.0 package with intentional health failure
activation -> HEALTH_CHECK failure
C032 recovery -> automatic rollback
core/active -> releases/1.1.0
lifecycle -> ROLLED_BACK
```

Result: **PASS**.

### Scenario 3 - Recovery Update

```text
core/active -> releases/1.1.0
signed healthy wpsc-1.2.1 package
update after previous failed release
core/active -> releases/1.2.1
lifecycle -> COMPLETED
```

Result: **PASS**.

## Isolation Evidence

- A Site configuration file is SHA-256 hashed before Scenario 1 and after Scenario 3: unchanged.
- A Site credential file is SHA-256 hashed before Scenario 1 and after Scenario 3: unchanged.
- C032 recovery whitelist still excludes `sites/`, public output, cache and Site credentials.
- Package verification returns public manifest data only and never returns signing material.
- Core Update source contains no WordPress, WooCommerce, Product API, Source Adapter, Dashboard, billing or SaaS dependency.
- Runtime, Scheduler, Queue, Dispatcher and Build Integration are health-check dependencies; their ownership is not moved into Product Update.

## CLI Evidence

The real coordinator is exercised through Product CLI for:

```text
wpsc update check
wpsc update plan
wpsc update
wpsc update status
wpsc update history
```

Root production CLI smoke evidence:

```text
update check  -> UP_TO_DATE when release store is empty
update status -> IDLE when no lifecycle exists
```

## Validation

Focused C037, CLI and staging tests:

```text
15 passed
0 failed
```

Core Update regression after VPS acceptance:

```text
54 passed
0 failed
```

Repository-wide regression:

```text
618 tests
609 passed
9 failed
```

The nine failures are pre-existing non-Core-Update expectations in SEO, incremental assets, commerce publishing, Builder/Theme rendering, Queue and the redesigned Vietnamese Setup UI. No C037/Core Update test failed. They still prevent claiming a repository-wide green regression.

`git diff --check`: **PASS**.

## Real VPS Provisioning Evidence

Target: `192.168.1.181`, workspace `/home/data/sites/wp-static`.

```text
VPS Phase 1 - Provision: PASS
Node: v20.19.5 at runtime/node/bin/node
core/active -> releases/1.0.0
config/wpsc.json: bootstrapped
config/installation.json: bootstrapped
Site Registry: tinsinhphat active
Generated systemd ExecStart: Node 20 + core/active/framework/src/cli/index.js

VPS Phase 2 - Trust / Package: PASS
config/core-update-public.pem: present
wpsc-1.1.0: signed healthy package
wpsc-1.2.0: signed intentional health-failure package
wpsc-1.2.1: signed healthy recovery package
Private signing key: discarded after package creation

VPS Phase 3 - Baseline: PASS
Site configuration SHA-256 aggregate: 3e33e965b0fb245e5b2dd59d992e486e6c33a5ce3d6dc3c5e69583bbce98a883
Credential SHA-256 aggregate: af3ca2065b759387a261ee5e40ba9dce78583044f3054283067eaf61eeb50f8f
Public output SHA-256 aggregate: 6811dcedc3e9bb552c590da49abffdc341e8c7b3b42178f7e1c67c96e3ad2a16
Initial Core tree SHA-256 aggregate: 4014937cfee941d206009bf123a2ba314b7c0201c490536387521ee9f5081252

## Real VPS Mutation Evidence

Evidence file: `storage/updates/c037-vps-evidence.json`.

### Scenario 1 - Healthy Update

```text
1.0.0 -> 1.1.0
check: UPDATE_AVAILABLE
plan: 1.1.0
lifecycle: COMPLETED
history events: 11
active Core: releases/1.1.0
Runtime restart/probe: PASS
```

### Scenario 2 - Broken Release and Automatic Rollback

```text
1.1.0 -> 1.2.0 broken
check: UPDATE_AVAILABLE
plan: 1.2.0
health: FAILED
C032 recovery: executed
lifecycle: ROLLED_BACK
history events: 8
active Core: releases/1.1.0
Runtime restart/probe after rollback: PASS
```

### Scenario 3 - Recovery Update

```text
1.1.0 -> 1.2.1
check: UPDATE_AVAILABLE
plan: 1.2.1
lifecycle: COMPLETED
history events: 11
active Core: releases/1.2.1
Runtime restart/probe: PASS
```

Independent post-check:

```text
systemd: active
service user/group: www-data:www-data
Node: v20.19.5
listener: 127.0.0.1:8787
ExecStart: runtime/node/bin/node core/active/framework/src/cli/index.js
final active Core: releases/1.2.1
scenario states: COMPLETED, ROLLED_BACK, COMPLETED
```

## VPS Integrity Evidence

| Aggregate | Before | After | Verdict |
| --- | --- | --- | --- |
| Site configuration | `3e33e965b0fb245e5b2dd59d992e486e6c33a5ce3d6dc3c5e69583bbce98a883` | same | PASS |
| Credentials | `af3ca2065b759387a261ee5e40ba9dce78583044f3054283067eaf61eeb50f8f` | same | PASS |
| Public output | `6811dcedc3e9bb552c590da49abffdc341e8c7b3b42178f7e1c67c96e3ad2a16` | same | PASS |
```

No credential values were read or printed. The VPS audit used paths and hashes only.

## Acceptance Matrix

| Gate | Verdict |
| --- | --- |
| Lifecycle orchestrator integration | PASS |
| Normal update E2E | PASS locally and on real VPS |
| Broken release -> automatic rollback | PASS locally and on real VPS |
| Recovery -> subsequent successful update | PASS locally and on real VPS |
| Site isolation | PASS, before/after aggregate unchanged |
| Secrets isolation | PASS, before/after aggregate unchanged |
| Runtime ownership audit | PASS |
| CLI check / plan / update / status / history | PASS locally |
| Full Core Update regression | PASS, 54/54 |
| Repository-wide regression | 9 known unrelated legacy failures; not a C037 implementation blocker |
| `git diff --check` | PASS |

## Freeze Decision

All C037 acceptance gates are green. The nine repository-wide failures remain recorded as known unrelated legacy expectations and are not represented as a green repository-wide regression.

**C037 - PASS / CLOSED.**

**Core Update Sprint - FROZEN.**

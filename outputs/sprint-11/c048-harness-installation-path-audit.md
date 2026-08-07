# C048 Harness / Installation Path Audit

**Status:** BLOCKER

**Scope:** Audit only. No C039, C047, C048 acceptance, transaction, health, systemd, Nginx, package, or target-state behavior was changed for this audit.

## Canonical Paths

| Role | Required path |
| --- | --- |
| Reviewed DEV / harness | `/home/data/sites/wp-static` |
| Installation target | `/home/data/sites/production/wpsctest` |
| Unexpected runtime source | `/home/data/sites/production/wp-static` |

## Observed Evidence

C048 VPS failures repeatedly identify first-party modules and the runner under:

```text
file:///home/data/sites/production/wp-static/framework/src/product/installer/createProductInstallerAcceptanceService.js
/home/data/sites/production/wp-static/scripts/c048-vps-installer-acceptance.js
```

This is not the canonical reviewed harness path. The Node binary was correctly Installation-owned (`/home/data/sites/production/wpsctest/runtime/node/bin/node`), but the JavaScript harness was not.

Subsequent VPS inspection confirms the canonical harness is a Git checkout at `03ffe5b` on `master...origin/master`. Its worktree is currently dirty: it contains uncommitted C044 corrective files and audit/output files. This does not change the path root cause, but it means the canonical harness is not presently a clean reviewed checkout and must not be treated as a final C048 acceptance source until those changes are separately reviewed/committed or otherwise resolved.

## Runner Resolution

`scripts/c048-vps-installer-acceptance.js` contains:

```js
const harnessWorkspace = path.resolve(new URL("..", import.meta.url).pathname);
```

The runner imports its first-party framework statically relative to itself:

```js
import { createProductInstallerAcceptanceService, createProtectedStateSnapshot }
  from "../framework/src/index.js";
```

It passes the derived value to the target-owned composition only as:

```js
factory({ harnessWorkspace, workspace })
```

Therefore the runner does **not** derive its harness from `process.cwd()`, nor does it swap `workspace` with `harnessWorkspace`.

The concrete mechanism is instead the command invocation used on VPS:

```text
cd /home/data/sites/production/wp-static
... runtime/node/bin/node scripts/c048-vps-installer-acceptance.js ...
```

Because the executed runner itself is `/home/data/sites/production/wp-static/scripts/c048-vps-installer-acceptance.js`, `import.meta.url` deterministically derives:

```text
harnessWorkspace = /home/data/sites/production/wp-static
```

and the static framework import resolves to:

```text
/home/data/sites/production/wp-static/framework/src/index.js
```

This exactly explains the unexpected paths in the VPS stack traces.

## Installation Mutation Boundary

The runner validates `--workspace` as an explicit absolute path and uses it for:

```text
runtime/node
config/c048-installer-runtime.mjs
storage/installer
core
releases
transaction.json
health.json
installation reports
```

The observed C047 transaction and health evidence identifies:

```text
workspace = /home/data/sites/production/wpsctest
installationId = wpsctest-c048
```

There is no evidence in the supplied transaction/health artifacts that these Installation mutations were redirected to either harness directory. This preserves the target mutation boundary, but does not cure the harness-origin violation.

## Filesystem / Module Identity

VPS evidence now proves the two trees are separate directories:

```text
DEV realpath:        /home/data/sites/wp-static
DEV inode:           69861377
DEV owner:           www-data:www-data
UNEXPECTED realpath: /home/data/sites/production/wp-static
UNEXPECTED inode:    70022957
UNEXPECTED owner:    tienlavan:www-data
Mount:               /home/data -> /dev/sdb2 (shared parent only)
UNEXPECTED framework: exists
```

The unexpected path is neither a symlink nor a distinct bind mount. It is an independent source-tree copy (directory timestamp reported as Aug 4). No architectural approval or documented alias exists for using it as a harness.

No `node_modules` or package-resolution evidence was provided that would independently import modules from the unexpected path. The stack traces are fully explained by the runner file location itself.

## Root Cause

**The C048 runner was executed from an undocumented second harness tree at `/home/data/sites/production/wp-static`.**

Because the runner correctly derives the harness from its own `import.meta.url`, it loaded first-party framework code from that same unexpected tree. This is a command/source-tree selection defect, not a `process.cwd()` dependency and not a target-workspace swap.

## Severity

**BLOCKER**

C048 cannot be accepted while the actual executed runner/framework origin differs from the canonical reviewed harness and the unexpected directory has not been proven to be an intentional filesystem alias.

## Required Remediation (Not Implemented)

1. On VPS, inspect `/home/data/sites/wp-static` and `/home/data/sites/production/wp-static` using the requested `realpath`, `stat`, symlink, and `findmnt` commands.
2. If the production path is not an explicitly approved alias, stop using it as a runner/harness.
3. Execute the canonical absolute runner path:

```bash
sudo /home/data/sites/production/wpsctest/runtime/node/bin/node \
  /home/data/sites/wp-static/scripts/c048-vps-installer-acceptance.js \
  --workspace /home/data/sites/production/wpsctest \
  --confirm
```

4. Confirm the target composition imports `/home/data/sites/wp-static/framework/src/index.js` and no module traces reference `/home/data/sites/production/wp-static`.
5. Only after the path audit passes, resume the separate C044/C047/C048 acceptance corrective.

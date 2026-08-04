# C043 - Global `wpsc` Command

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C043 renders and atomically installs `/usr/local/bin/wpsc`. The launcher resolves an Installation from the C038 Registry, then executes that Installation's owned Node binary and active Core CLI.

C043 does not install Node, bootstrap Core, configure systemd or modify Sites.

## Resolution Contract

Supported invocation forms:

```text
wpsc <command...>
wpsc --installation <id> <command...>
wpsc --installation=<id> <command...>
```

Resolution behavior:

- explicit selector chooses the registered Installation;
- otherwise Registry default is used;
- no default produces `installation selection required`;
- an unknown Installation is rejected;
- current working directory is never used as an implicit selector.

The Installation selector is a global launcher prefix. After consuming it, every remaining argument is forwarded unchanged and in the original order.

Executable boundary evidence covers:

```text
wpsc --installation staging --foo "a b" --path="/tmp/x y" -- --installation production --installation=
```

Only the first prefix selector is consumed. Selector-like arguments after the command boundary remain untouched. A bare `--installation` and empty `--installation=` are rejected before execution.

## Runtime Authority

For the selected workspace, the launcher resolves exactly:

```text
<workspace>/runtime/node/bin/node
<workspace>/core/active/framework/src/cli/index.js
```

Both paths are absolute. The launcher validates that Node is executable and the active Core CLI exists before execution.

Before exec, the launcher resolves the physical workspace, Node directory and active Core CLI directory with POSIX `cd -P`/`pwd -P`. Both canonical directories must remain below the selected canonical workspace. The Node binary and CLI file themselves must not be symlinks. Tests replace Node with an external symlink and `core/active` with a symlink into another Installation; both are rejected before execution.

It exports only non-secret execution context:

- `WPSC_INSTALLATION_ID`;
- `WPSC_INSTALLATION_ROOT`;
- `WPSC_INSTALLATION_NODE`.

No credential or Site state enters the launcher.

## No PATH/NVM Dependency

The generated command:

- does not use `#!/usr/bin/env node`;
- does not call `node` through PATH;
- does not source NVM;
- does not inspect shell profiles;
- executes successfully with `PATH=/nonexistent` and `NVM_DIR=/missing`.

The POSIX shell is used only to select a pre-rendered Registry mapping and `exec` the absolute Installation Node path.

## Shell-safe Registry Rendering

- Installation IDs are limited to the C038 safe identifier contract; shell metacharacters are rejected at render time.
- Workspaces are single-quoted with embedded quote escaping.
- No `eval`, command substitution or dynamically constructed command string is used.
- Executable evidence covers ID `staging-prod` and a workspace containing spaces, a single quote, `$()`, semicolon and additional shell punctuation. The exact path reaches the CLI without executing embedded text.

## Multi-installation Evidence

The fixture Registry contains independent production and staging workspaces. Tests prove:

- default invocation resolves production;
- `--installation staging` resolves staging;
- `--installation=production` resolves production;
- each selection uses its own Node path;
- each selection uses its own `core/active` CLI;
- no default requires explicit selection.

## Atomic Installation

```text
render launcher
-> exclusive temporary file
-> write
-> file fsync
-> chmod 0755
-> atomic rename to command path
-> directory fsync
```

A simulated rename failure removes the temporary file and leaves the previous global launcher byte-identical and executable. This keeps C043 compatible with C038 REPAIR ownership.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| `wpsc --version` works | Default Installation CLI receives `--version` |
| Arguments forwarded unchanged | Command, flags and path with spaces preserved |
| Installation Node used | CLI receives exact selected `runtime/node/bin/node` path |
| Active Core used | Launcher executes selected `core/active` CLI |
| No PATH dependency | Passes with invalid PATH |
| No NVM dependency | Generated content contains no NVM and passes with missing NVM_DIR |
| Production/staging isolation | Independent roots and Node paths returned |
| Missing default | Explicit selection error |
| Failed replacement | Previous launcher remains authoritative |

## Ownership

- C038 owns Installation Registry and selection policy.
- C039 owns Installation Node.
- C042 owns initial `core/active`.
- C043 owns only the global launcher artifact.
- C044 owns systemd and Runtime service installation.

## Validation

Focused C043:

```text
tests 9
pass 9
fail 0
cancelled 0
```

C038-C043, Product Package and frozen Core regression:

```text
tests 98
pass 98
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C043 implementation and acceptance evidence are complete. The generated launcher uses deterministic Installation Registry resolution, Installation-owned Node and the selected active Core without PATH/NVM dependence. It is ready for audit and explicit close.

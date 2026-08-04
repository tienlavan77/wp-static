# C044 - systemd Runtime Installer

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C044 renders, installs and activates one Installation-specific systemd Runtime unit. It owns unit backup, atomic replacement, daemon reload, enable/restart, readiness and unit rollback.

C044 does not install Node, modify Core, configure Nginx, mutate Sites or own Runtime application behavior.

## Unit Identity

Unit naming is deterministic and Installation-scoped:

```text
wpsc-runtime-<installationId>.service
```

Production and staging therefore receive independent unit files and cannot overwrite one another.

## Runtime Contract

The generated service uses:

```text
User=www-data
Group=www-data
WorkingDirectory=<installation workspace>
EnvironmentFile=<workspace>/config/runtime.env
ExecStart=<workspace>/runtime/node/bin/node
          <workspace>/core/active/framework/src/cli/index.js
          runtime:serve ...
```

Node, CLI, Runtime configuration and project paths are absolute. Unit arguments are systemd-quoted, including spaces, quotes, backslashes and escaped `%` specifiers.

No PATH, NVM or system Node resolution is used.

## Privileged Boundary

The default privileged adapter invokes an absolute `systemctl` path for:

- `daemon-reload`;
- `enable`;
- `restart`;
- `is-active --quiet`;
- `disable` during failed first activation.

Tests inject the adapter and prove call ordering without mutating the host systemd installation.

## Installation Sequence

```text
render Installation-specific unit
-> read existing unit
-> persist Installer-owned backup when present
-> exclusive temporary unit write
-> file fsync
-> atomic rename
-> directory fsync
-> systemctl daemon-reload
-> systemctl enable
-> systemctl restart
-> is-active
-> HTTP readiness probe
-> ACCEPT
```

The default readiness probe targets `http://127.0.0.1:<port>/health`. Both service-active and health-success evidence are required.

## Existing Unit Backup

Existing unit content is copied atomically to:

```text
<workspace>/storage/installer/backups/systemd/
  wpsc-runtime-<installation>.service.<timestamp>.bak
```

The backup is mode `0600` and remains available for inspection/recovery.

## Failure and Rollback

When activation or readiness fails:

- an existing unit is restored byte-identically;
- systemd is reloaded after restoration;
- the previous unit is restarted;
- a first-install unit is removed;
- first-install enablement is disabled when supported;
- no failed unit remains authoritative.

Executable evidence covers a readiness failure after unit activation and proves the previous unit plus backup contain identical bytes.

## Running-process Evidence

The focused test performs an actual process launch from the generated `ExecStart` command. The fixture process records:

- the exact Installation Node launcher path;
- the exact `core/active` CLI path;
- Runtime arguments supplied by the unit.

Readiness succeeds only after that process evidence exists. This proves the installed unit is not merely textually correct; its running process resolves the selected Installation Node and active Core.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| Runtime user | `User=www-data`, `Group=www-data` |
| Absolute Node | Workspace-owned absolute Node path in unit and process evidence |
| Active Core | Absolute `core/active` CLI path in unit and process evidence |
| Existing unit backup | Backup byte-identical to prior unit |
| Readiness | Active state plus successful probe |
| Failed activation rollback | Previous unit restored and restarted |
| Failed first activation | Unit removed and enablement disabled |
| Installation identity | Separate production/staging unit names |
| Multi-installation isolation | Both unit files coexist with distinct content |

## Ownership

- C038 owns Installation transaction and external-operation recovery intent.
- C039 owns Installation Node.
- C042 owns initial Core and `core/active`.
- C043 owns the global CLI launcher.
- C044 owns the systemd unit lifecycle only.
- C045 owns Nginx configuration and activation.

## Validation

Focused C044:

```text
tests 5
pass 5
fail 0
cancelled 0
```

C038-C044, Product Package and frozen Core regression:

```text
tests 103
pass 103
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C044 implementation and acceptance evidence are complete. It installs an Installation-owned Runtime service, proves the process uses Installation Node and active Core, and restores the prior valid unit on failure. It is ready for audit and explicit close.

# C050-3 Production Workflow Validation

```text
C050-3 = BLOCKED
FIRST MISSING OWNER = reviewed target Release artifact/configuration approval
REQUIRED OPERATION = select and approve a Release newer than production 1.1.0
WHY C050 CANNOT SAFELY SUBSTITUTE IT = C050 may orchestrate an approved Release but cannot invent version identity, sign a production Release without authorization, or reuse the currently active 1.1.0 as a rollout test
```

## Production Preflight

The last trusted C049 closeout records production at Release `1.1.0`, with C047
HEALTHY, C049 transaction COMPLETED, Runtime/systemd/Nginx identity `1.1.0`,
protected-state equality true and Release `1.0.0` retained. Fresh production
preflight was not executed because this local task has no direct authorized VPS
session and no mutation was attempted.

## Trusted Artifact Gate

The local repository contains reviewed historical `1.0.0` and `1.1.0` artifacts.
It contains no separately reviewed newer target Release and no reviewed C050
production release-operations configuration. Reusing `1.1.0` would not validate
a real rollout, while inventing `1.2.0` would violate the trusted Release gate.

## Result

```text
Publication = NOT RUN
Rollout = NOT RUN
C049 update = NOT RUN
C049 recovery = NOT RUN
C048 = NOT RUN
Runtime restart = NONE
systemd operation = NONE
VPS mutation = NONE
Production publication = NONE
```

## Local Readiness Added

The root CLI rollout path is now covered by a local Installation-owned C049
composition E2E fixture. It proves dry-run calls `check` only, while confirmed
rollout delegates `update` and `status` and preserves the explicit Installation
identity. This does not alter the production blocker or authorize VPS mutation.

## Required Inputs to Resume

1. Explicit target Product Release version newer than `1.1.0`.
2. Reviewed C040 signed package directory for that version.
3. Reviewed transport bundle with expected size and SHA-256.
4. Reviewed C041 public key path.
5. Reviewed production `wpsc.release-operations` configuration and channel.
6. Authorized VPS execution context or operator-run command output.

Once supplied, the normal operator workflow is expected to be:

```text
1. wpsc product release verify
2. wpsc product release publish --confirm
3. wpsc product rollout --confirm
4. wpsc product verify-installation
```

Manual `wpsc update`, Core activation, Runtime/systemd restart, C048 and direct
filesystem publication remain prohibited unless an authoritative failure owner
requires an exceptional recovery operation.

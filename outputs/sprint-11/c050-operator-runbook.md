# C050 Product Release Operator Runbook

## Normal Workflow

The normal Product Release workflow has four operator stages:

```text
BUILD -> VERIFY -> PUBLISH -> ROLLOUT
```

C050 does not replace the lifecycle owners. It exposes a small orchestration
surface over C040, C041, the C050 publisher and C049.

## 1. Build and Bundle

Use the reviewed C040 release-authoring task to create:

```text
signed package directory
transport bundle JSON
public verification key
release size and SHA-256
reviewed release metadata
```

Do not publish an artifact that has not passed the release-authoring gate.

## 2. Verify

```bash
wpsc product release verify \
  --package-dir <signed-package-directory> \
  --public-key <public-key.pem> \
  --json
```

Expected success includes `accepted: true`, `verification: "C041"` and
`mutation: "NONE"`.

## 3. Publication Preflight

```bash
wpsc product release publish \
  --package-dir <signed-package-directory> \
  --artifact <transport-bundle.json> \
  --config <release-operations.json> \
  --channel <channel> \
  --dry-run \
  --json
```

Dry-run must return `ok: true`, `status: "DRY_RUN"` and `mutation: "NONE"`.
It must not create the publication destination.

## 4. Publish

```bash
wpsc product release publish \
  --package-dir <signed-package-directory> \
  --artifact <transport-bundle.json> \
  --config <release-operations.json> \
  --channel <channel> \
  --confirm \
  --json
```

Expected statuses are `PUBLISHED` or `IDEMPOTENT_SUCCESS`. A conflicting
same-version artifact must fail with `RELEASE_IDENTITY_CONFLICT`.

## 5. Production Read-Only Preflight

Run both commands before mutation:

```bash
wpsc product verify-installation \
  --installation <installation-id> \
  --json

wpsc product rollout \
  --installation <installation-id> \
  --channel <channel> \
  --config <release-operations.json> \
  --dry-run \
  --json
```

The first command reads existing health/evidence. The second resolves the
Installation through Registry and calls C049 check only. Neither command creates
a transaction or restarts Runtime.

## 6. Rollout

```bash
wpsc product rollout \
  --installation <installation-id> \
  --channel <channel> \
  --config <release-operations.json> \
  --confirm \
  --json
```

C050 delegates mutation to C049. C049 owns acquisition, verification,
extraction, activation, transaction, recovery, Runtime restart, health,
protected-state comparison and evidence.

## 7. Verification

```bash
wpsc product verify-installation \
  --installation <installation-id> \
  --json
```

Do not declare success from exit code alone. Confirm the C049 transaction is
COMPLETED, evidence is PASS, health is HEALTHY, live identities match the target
Release and the previous Release remains retained.

## Exceptional Operations

- `wpsc update recover`: only after an actual C049 failure requires recovery.
- C048: bootstrap, baseline reacceptance or authorized recovery only.
- SSH, sudo, systemctl, curl and filesystem inspection: diagnostics or a proven
  privileged boundary only.
- Manual artifact copy, Core activation and Runtime restart are not normal
  release operations.

## Security

- Never place a private key in release-operations configuration or evidence.
- Never transfer the private signing key to the publication destination or VPS.
- Never use credential-bearing URLs.
- Never infer Installation identity from CWD.
- Never overwrite an immutable same-version publication.

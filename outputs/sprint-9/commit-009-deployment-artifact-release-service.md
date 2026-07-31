# Sprint 9 Commit 009 - Deployment Artifact & Release Service

Status: PASS

## Delivered

- Added the versioned `wpsc.deployment-artifact` contract.
- Added immutable Site-scoped artifact snapshots under
  `sites/<site>/storage/artifacts/<artifact>/`.
- Added artifact ID, Site ID, version, build reference, runtime compatibility,
  creation metadata and file manifest.
- Added deterministic SHA-256 file manifest and artifact integrity checksum.
- Added separate mutable release lifecycle records while keeping the artifact
  itself immutable.
- Added release states: `created`, `validated`, `ready`, `deployed`, `failed`,
  `superseded`.
- Added artifact integrity validation and ready gating.

## Artifact Boundary

```text
Builder Output / Output Pipeline
        -> immutable artifact snapshot
        -> release lifecycle record
        -> Deployment (Commit 010)
```

The Artifact Service copies existing Builder output. It does not invoke Builder,
read WordPress/WooCommerce, construct content or create a second build pipeline.

## Integrity and Immutability

- Every file in the output snapshot is represented by path, size and SHA-256.
- A deterministic manifest checksum identifies the artifact content.
- Reusing an Artifact ID is rejected.
- Artifact metadata is never rewritten after creation.
- Release status is stored separately to preserve immutable artifact content.
- Only a `validated` artifact can become `ready`.

## Validation

```bash
node --test test/deploymentArtifactService.test.js test/operationsAuthorizationService.test.js test/siteBackupService.test.js test/siteHealthService.test.js
git diff --check
```

Focused Deployment Artifact, Authorization, Backup and Health validation passed
with 6 tests.

## Architecture Result

Commit 009 creates the immutable Builder-output boundary required for deployment
without making Deployment a Build authority. Deployment orchestration and
rollback remain Commit 010.

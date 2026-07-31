# Sprint 9 Commit 008 - Access Control & Operations Authorization

Status: PASS

## Delivered

- Added the versioned `wpsc.operations-authorization` contract.
- Added explicit operational capability vocabulary for inspection, configuration,
  Build operation, deployment, backup, restore, security, extensions and
  multi-site administration.
- Added deny-by-default authorization.
- Added exact `operator + capability + siteId` scope evaluation.
- Added guarded execution that never invokes an unauthorized operation.
- Added auditable allow and deny decisions through the Structured Audit Trail.
- Added immutable authorization responses and normalized denial diagnostics.

## Authorization Model

```text
Operator
  + Capability
  + Site scope
  = Authorized operation
```

An operator granted Backup for Site A is not implicitly allowed Backup for Site
B, Deployment, Restore, Security Administration or Content Authoring.

## Protected Capabilities

```text
site.inspection
site.configuration
build.operation
deployment
backup
restore
security.administration
extension.administration
multi_site.administration
```

## Boundary

The service evaluates authorization and writes an audit fact. It does not own
operator identity provisioning, Content CRUD, provider authentication, Scheduler
execution, Queue storage, Builder execution or deployment implementation.

## Validation

```bash
node --test test/operationsAuthorizationService.test.js test/secretsBoundaryService.test.js test/operationalObservabilityService.test.js test/siteOperationsService.test.js
git diff --check
```

Focused Authorization, Secrets, Observability and Operations validation passed
with 8 tests.

## Architecture Result

Commit 008 protects production operations with Site-scoped, auditable,
deny-by-default authorization while preserving the authority model. Deployment
Artifacts and Release Service remain Commit 009.

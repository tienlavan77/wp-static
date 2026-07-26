# WPSC Sprint 5 Final Review

## Sprint

Sprint 5 - Production Installer & Release Package

## Status

Completed.

## Objective

Sprint 5 turns WPSC into a product that can be packaged, uploaded to production hosting, installed through a browser flow, validated, and recovered safely.

## Completed Commits

| Commit | Scope | Result |
| --- | --- | --- |
| 001 | Release Package Structure | Done |
| 002 | HTTP Installer | Done |
| 003 | Persistent Configuration | Done |
| 004 | Production Build | Done |
| 005 | Installation Lock | Done |
| 006 | Release Builder CLI | Done |
| 007 | Deployment Guide | Done |
| 008 | Installation Recovery | Done |
| 009 | Release Validation | Done |
| 010 | Documentation and Final Review | Done |

## User Flow

```text
Build release
-> Validate release
-> Upload to server
-> Point domain
-> Open /install
-> Complete installation
-> Lock installer
-> Website ready
```

## CLI Flow

Build:

```bash
wpsc release build --project <project-dir> --output-dir <release-dir> --mode vps --clean
```

Validate:

```bash
wpsc release validate --release-dir <release-dir>
```

Recover only when needed:

```bash
wpsc release recover --release-dir <release-dir> --reason <reason> --confirm
```

## Deliverables

- Release package structure definition.
- Browser HTTP installer handler.
- Persistent `config/project.json`, `config/runtime.json`, and `config/install-state.json`.
- Production install build primitive.
- Installation lock and already-installed guard.
- Controlled installation recovery that archives the lock.
- Release builder CLI.
- Release validation CLI.
- Production deployment guide.
- Commit diff and review records.

## Architecture Review

Sprint 5 preserved the boundaries frozen in Sprint 0.

| Area | Result |
| --- | --- |
| Installer | Extended through HTTP and release primitives |
| Runtime Kernel | Not changed |
| Build Platform | Consumed through injected runner |
| Release System | Owns package, lock, recovery, and validation |
| CLI | Parses commands and formats results only |
| Theme System | Not changed |
| Adapter Layer | Not changed |

## Validation

Commit-level tests were added for:

- release package building
- HTTP installer routes
- persistent configuration
- production install build primitive
- installation lock
- installation recovery
- release validation

Representative commands:

```bash
node --test test/releaseBuilder.test.js
node --test test/httpInstaller.test.js
node --test test/persistentConfiguration.test.js
node --test test/productionInstallBuild.test.js
node --test test/installationLock.test.js
node --test test/releaseValidation.test.js
```

## Production Readiness

Sprint 5 makes WPSC ready for a controlled VPS deployment path.

The recommended production path is:

1. Build release locally or in CI.
2. Validate the release package.
3. Upload to the VPS.
4. Configure Nginx and PHP.
5. Open `/install`.
6. Complete install.
7. Confirm `/install` is locked.

## Known Limits

The following are intentionally out of scope for Sprint 5:

- zip archive generation
- provider-specific deployment automation
- browser recovery UI
- cloud release dashboard
- shared-hosting runtime build guarantee
- secret provisioning automation

## Decision

Sprint 5 is complete and ready for approval.

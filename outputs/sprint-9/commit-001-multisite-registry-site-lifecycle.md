# Sprint 9 Commit 001 - Multi-site Registry & Site Lifecycle

Status: PASS

## Delivered

- Added the versioned `wpsc.site-registry` contract.
- Added persistent registry storage at `sites/registry.json`.
- Added Site-scoped domain mapping with canonical hostname normalization.
- Added runtime configuration references and environment metadata per Site.
- Added operational lifecycle states: `active`, `suspended`, `deactivated` and `deleted`.
- Added domain-to-Site resolution and Site Context creation.
- Rejected duplicate domain assignments across Sites.
- Preserved existing Setup/Build `SiteState` independently from operational lifecycle.
- Preserved compatibility for legacy Sites that do not have a registry record yet.

## Registry Boundary

```text
Site Registry
    -> Site identity
    -> Domain mapping
    -> Runtime configuration reference
    -> Operational status

Site Context
    -> Site Runtime
    -> Setup / Scheduler / Build
```

The registry owns operational identity and lifecycle only. It does not own
WordPress content, WooCommerce data, Build state, Scheduler state or provider
credentials.

## Isolation Rules

- A registry record always belongs to one `siteId` and one UUID.
- A domain can belong to only one Site.
- Suspended, deactivated and deleted Sites are not resolved as active domains.
- Registry lifecycle changes do not mutate Setup/Build metadata.
- Runtime configuration is referenced by path; secrets are not stored in the registry.
- Legacy Site directories remain readable until they are explicitly registered.

## Validation

```bash
node --test test/siteRegistry.test.js test/siteRepository.test.js test/siteContext.test.js test/siteMetadata.test.js test/siteStateManager.test.js
git diff --check
```

Focused Site Registry, Repository, Site Context, Metadata and State Manager
validation passed with 15 tests.

## Architecture Result

Commit 001 adds the production Site Registry without changing Runtime Flow,
Content Authority, Commerce Authority, Scheduler ownership, Queue ownership or
Builder ownership. It provides the Site-scoped foundation required by the
Operations Control Plane in Commit 002.

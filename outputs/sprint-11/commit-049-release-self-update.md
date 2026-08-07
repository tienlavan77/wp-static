# C049 - Release N -> N+1 Self-Update

**Status:** IN PROGRESS - local foundation implemented; real VPS acceptance pending.

## Scope

C049 adds a generic Release update boundary for an existing Installation. It does not create an Installation, replace Node, create a second transaction engine, create a second package downloader/verifier, or change C048 acceptance semantics.

The service receives `workspace` and `installationId`; it does not hard-code `wpsctest` or any VPS path.

## Implemented Foundation

- `createReleaseMetadataService` reads the authoritative `core/active` pointer for the current Release.
- Trusted Release metadata requires Product identity, semver, HTTPS, allow-listed host, size, SHA-256 and Node-major compatibility.
- Availability is read-only and distinguishes `UPDATE_AVAILABLE`, `UP_TO_DATE` and `INCOMPATIBLE`.
- `createReleaseUpdateService` reuses C038 `createInstallationTransactionService` with fixed update operation handlers.
- Acquisition is delegated to the injected C047 Production Package Acquisition service.
- Authenticity is delegated to the injected C041 verifier.
- Staging and activation are delegated to injected existing Core update boundaries.
- Runtime restart and C047 health are explicit gates before `COMPLETED`.
- Protected-state snapshots are compared before/after update.
- Evidence is written through an injected atomic evidence store.

## Local Evidence

Focused C049/C038 foundation:

```text
tests 19
pass 19
fail 0
cancelled 0
```

Covered locally:

- current Release is read from `core/active`;
- compatible newer Release is selected while incompatible newer metadata is classified;
- availability does not mutate the active pointer;
- C038 transaction lock/fence/checkpoints are used;
- verified `1.0.0 -> 1.1.0` staging/activation preserves the previous Release;
- C041 verification failure blocks activation;
- protected snapshots remain unchanged.

`git diff --check`: PASS

## Remaining C049 Work

- Wire the C049 service into the Installation-owned Product CLI without conflicting with existing C043 commands.
- Add restart/resume and post-activation recovery integration using the existing C038/C032 recovery boundary.
- Add target composition and machine evidence schema `wpsc.c049-self-update`.
- Publish a signed `1.1.0` bundle and run real `1.0.0 -> 1.1.0` acceptance on `/home/data/sites/production/wpsctest`.
- Prove global `wpsc`, systemd, Runtime and Nginx serve the new Release while the old Release remains present.
- Run the C028-C049 regression before any PASS decision.

## Boundary

The canonical reviewed harness remains `/home/data/sites/wp-static`. The real Installation target remains `/home/data/sites/production/wpsctest`. The unapproved `/home/data/sites/production/wp-static` tree is not used by C049.

## Verdict

C049 is not closed. Local foundation is green; real Release `1.0.0 -> 1.1.0` acceptance and final lifecycle evidence are still required.

# Core Update C032 - Update Backup and Recovery Point

## Status

PASS CANDIDATE, NOT CLOSED. All C032 acceptance evidence is green; final audit approval is required before the Git commit and C033.

## Implemented Foundation

- Added `CoreUpdateRecoveryService` under Product Update ownership.
- Creates recovery material under `storage/updates/recovery/<recoveryId>/`.
- Scopes recovery to Core Update data only: product configuration, Product Migration checkpoint, Core Update checkpoint and Core active pointer.
- Restores only the files recorded in the recovery manifest.

## Explicit Boundary

Core recovery is not Site backup. The service does not enumerate or copy `sites/`, Site build output, content snapshots, provider credentials, webhook secrets, cache, media or public artifacts.

## Acceptance Evidence

- The focused test creates a Site credential file, creates recovery, changes Core configuration, restores recovery, then proves the old configuration returns while the credential file was neither copied nor altered.
- Recovery records a SHA-256 digest for every manifest-listed Core file. Restore verifies every digest before it starts to replace any destination file.
- Restore accepts only the fixed Core Update whitelist (`config/wpsc.json`, Product Migration checkpoint, Core Update checkpoint and Core active pointer). A manifest path outside that list, including path traversal input, is rejected.
- Recovery manifest persistence uses a temporary file and atomic rename. Its temporary name is process-specific rather than a shared fixed `.tmp` name.
- Focused C032 tests: 4 passed, 0 failed.
- A tampered recovery file is rejected by SHA-256 verification before restore writes the first destination file; the test proves the already-broken live configuration remains unchanged rather than becoming partially restored.
- The active Core pointer is captured, changed to a broken value, then deterministically restored to its prior release value.
- A simulated failure while persisting a new recovery manifest leaves the new recovery without `recovery.json`; an existing known-good recovery remains valid and restores the old Core configuration.

## Persistence-Failure Scenario

```text
known-good recovery exists
  -> create a new recovery
  -> copy Core-only files to its private directory
  -> write recovery.json.simulated.tmp successfully
  -> simulate failure before rename to recovery.json
  -> no recovery.json exists for the new directory
  -> the new directory cannot be considered usable
  -> known-good recovery restores the old configuration
```

The focused test asserts both facts: the temporary manifest exists (the failure happens after its write), and the final `recovery.json` does not exist. Restore has no discovery path that treats an unmanifested directory as a recovery point: it requires `recovery.json`, validates the immutable whitelist and verifies every SHA-256 digest before replacing a live file.

## Full Regression

```text
29 tests passed, 0 failed (final run: 2026-08-03)
```

The regression includes Core Update lifecycle, release discovery, package verification, planner dry-run, recovery service, Product Migration, Product architecture audit and existing multi-Site installation/upgrade E2E.

`git diff --check`: PASS.
- `git diff --check` passes.

## Audit Verdict

All C032 implementation and test acceptance gates are green. This is a PASS CANDIDATE only; the auditor closes C032 after reviewing this report. C033 Isolated Staging must not start before that closure.

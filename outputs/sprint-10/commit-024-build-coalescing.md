# Sprint 10 Commit 024 - Build Coalescing and Concurrency Protection

Status: PASS

- A second pending Job for the same Site is merged into the existing queued Job.
- Changed hints are deduplicated; normalized change metadata is merged by entity.
- A running Job retains the one-active-Build-per-Site lock and rejects a new Job.
- Queue owns storage/lifecycle; Scheduler and Dispatcher retain their existing
  trigger/execution responsibilities.

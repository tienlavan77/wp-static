# Sprint 10 Commit 023 - Build Telemetry and Durable History

Status: PASS

- Adds Site-scoped durable build history at `storage/build/history.json`.
- Records build ID, full/incremental mode, changed routes, pages written, total
  pages, total duration, and source/build/publish phase durations.
- History is bounded to 50 entries and contains no credentials or raw Source
  configuration.
- Telemetry is recorded only after a successful output publish.

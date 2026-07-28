# Sprint 6 - Phase 4 - Commit 021

Final validation reads persisted source metadata through a Setup-owned readiness service.
When valid, Setup Service transitions to `READY_FOR_FIRST_BUILD` and emits
`setup.readyForFirstBuild`. Webhook support remains optional; an existing webhook
status must be verified. Registration and webhook workflows are unchanged.

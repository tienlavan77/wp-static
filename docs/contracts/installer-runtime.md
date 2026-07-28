# Installer Runtime Contract

Installer Controller is a Browser-facing Runtime controller over injected Setup
Service, Site Repository, and Site State Manager. It starts Setup, validates and
persists runtime configuration, then transitions Site metadata from
`SETUP_REQUIRED` to `READY_FOR_FIRST_BUILD`.

It does not register Source/Webhook or invoke Scheduler/Build Engine; those are
later Phase 7 integrations.

# Scheduler Contracts

Scheduler controls when build jobs run; it does not build. Job Queue owns job
storage/lifecycle, and Dispatcher calls Build Engine. Their contracts are
separate from Build Engine and use `scheduler.*` and `job.*` events only.

A Job stores id, site id, trigger type, timestamps, duration, status, and
shared diagnostics. Build state remains exclusively in Build Engine.

These interfaces are frozen after Phase 6: Scheduler implements `start`,
`stop`, and `tick`; Queue implements `enqueue` and `next`; Dispatcher implements
`dispatch`. Later implementations and extensions must preserve these boundaries.

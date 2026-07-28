# First Build Readiness Contract

`READY_FOR_FIRST_BUILD` means that Setup has validated persisted source metadata
and the Site is eligible for a later Build Engine operation.

It does not mean a build has started, is queued, is running, or has finished.
Those states and their events belong exclusively to Build Engine.

The sole domain event is `setup.readyForFirstBuild`. It is emitted after final
validation and the Setup state transition. Webhook support is optional; if a
webhook is persisted, its status must be `verified`.

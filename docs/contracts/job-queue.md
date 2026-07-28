# Job Queue Contract

Job Queue owns immutable job snapshots in pending, running, and finished sets.
Claiming a pending job creates a new `RUNNING` snapshot; completion creates a
new terminal snapshot. The Queue never mutates Job metadata, dispatches a job,
or invokes Build Engine.

Only one pending or running job may exist for a Site at one time. This is the
Phase 6 in-process Site Lock boundary.

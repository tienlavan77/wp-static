# Core Update C031 - Update Planner and Dry Run

## Delivered

- Added a deterministic Core Update Planner.
- A plan requires release discovery, package verification, migration plan and configuration validation to pass.
- The plan declares backup, activation, rollback, preserved Sites and references-only secrets.

## Boundary

`plan()` performs no Core Update lifecycle transition and no filesystem/configuration/Site/Runtime mutation. Download, backup, staging and activation remain later commits.

## Validation

Focused tests snapshot an otherwise empty workspace before and after `plan()` and prove it stays identical.

They also execute `plan()` twice against identical verified release, migration and configuration inputs, then assert structural and serialized equality of the resulting plan.

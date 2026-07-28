# Setup Presentation Contract

## Purpose

`SetupPresentation` is State Machine-owned metadata for thin clients. Browser
and CLI render it; they do not map state IDs to UI behavior themselves.

```json
{
  "title": "Validating environment",
  "progress": 25,
  "canAdvance": true,
  "revision": 1
}
```

## Fields

- `title`: human-readable current activity.
- `progress`: integer percentage supplied by the service.
- `canAdvance`: whether the current service-owned action can advance.
- `canFinalize`: whether Setup Service permits the final readiness action.
- `revision`: State Machine revision used to synchronize client snapshots.

State IDs remain opaque to Browser clients. Presentation is intentionally small
and must not become a Browser-specific workflow configuration format.

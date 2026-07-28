# Commit 047 - Sprint 6 Final Closeout

Status: **PASS - Architecture Frozen**

## Audit Result

| Audit area | Status | Evidence |
| --- | --- | --- |
| Sprint architecture | PASS | Provisioning -> Setup Service -> Runtime gateways -> Scheduler -> Queue -> Dispatcher -> Build -> Output ownership is defined and tested. |
| Runtime composition | PASS | C43-C45 provide one real Site Runtime composition, router, and HTTP transport. |
| Boundary validation | PASS | Browser/PHP transport calls Runtime Router; First Build calls Scheduler; only Output Pipeline writes `public/dist`. |
| Runtime validation | PASS | C46 passed in a real local PHP + Node HTTP topology (`pass 1`, `fail 0`). |
| Definition of Done | PASS | Every required Site lifecycle step is covered by the C46 E2E scenario. |

## Definition Of Done Evidence

- Domain request is forwarded by generated `public/index.php` to Node Runtime.
- Browser reaches Installer, then Dashboard after configuration persists.
- Dashboard registers Source and Webhook; UUID and secret are runtime-managed.
- First Build goes through Scheduler, Queue, Dispatcher, Build Integration, and
  Output Pipeline.
- Build completes with Site state `RUNNING`, writes `public/dist`, and PHP
  serves the generated static HTML.

## Frozen Architecture

```text
Domain -> PHP front controller -> Node Runtime HTTP -> Runtime Router
-> Setup/Dashboard gateways -> Scheduler -> Queue -> Dispatcher
-> Build Integration -> Output Pipeline -> sites/<site>/public/dist
```

Ownership is frozen:

- Setup Service owns setup workflow and sessions.
- Scheduler owns request policy; Queue owns job lifecycle; Dispatcher executes
  injected builds; Build Engine owns build lifecycle.
- Output Pipeline exclusively owns Site static filesystem writes.
- Browser/PHP transport and CLI are clients; they do not contain business
  workflow or access Build Engine directly.

## Deferred Work

Incremental builds, deployment, preview, monitoring, distributed queue, remote
cache, and scheduler persistence remain separate future work. They must extend
the frozen boundaries rather than bypass them.

Sprint 6 is complete. The WPSC v2 Site Runtime Platform is frozen.

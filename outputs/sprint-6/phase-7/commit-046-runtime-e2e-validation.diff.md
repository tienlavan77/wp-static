# Commit 046 - Runtime End-to-End Validation

## Purpose

Validate the complete Site Runtime flow in a real local HTTP topology before the
Sprint 6 closeout:

```text
Provisioning -> public/index.php -> PHP -> Node Runtime -> Installer
-> Dashboard -> Source -> Webhook -> Scheduler -> Build -> public/dist
-> Running Website
```

## Delivered

- Added `createRuntimeHttpServer`, the thin Node HTTP transport for the pure
  Runtime Router. It only translates HTTP input/output and contains no Site,
  Setup, or Build workflow.
- Updated the generated PHP front controller to forward the Domain `Host` and
  request content type to Node, then preserve the upstream response status and
  content type.
- Added `test/siteRuntimeE2E.test.js`. It provisions an isolated Site,
  starts a real Node Runtime server and PHP built-in server, invokes every
  dashboard action through PHP, verifies persisted configuration, and fetches
  the generated static HTML from `public/dist`.

## Boundaries Preserved

- PHP is only the Site front-controller/proxy.
- Node HTTP transport only calls Runtime Router.
- Browser requests reach Scheduler through First Build Controller; they never
  call Queue, Dispatcher, or Build Integration directly.
- Output Pipeline remains the only component writing `public/dist`.

## Evidence Command

```sh
node --test test/siteRuntimeE2E.test.js
```

The test requires permission to bind temporary loopback ports for the Node and
PHP servers. Its execution state is recorded in `runtime-validation-report.md`.

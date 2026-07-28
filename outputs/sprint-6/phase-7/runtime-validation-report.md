# Runtime Validation Report - Commit 046

## Scope

The E2E scenario is intentionally isolated in a temporary workspace and uses
the actual Runtime composition, filesystem repository, generated PHP front
controller, Node HTTP server, PHP built-in server, Scheduler, Build Integration,
and Output Pipeline.

## Required Evidence

| Check | Evidence asserted by `test/siteRuntimeE2E.test.js` |
| --- | --- |
| Site skeleton | Provisioning creates `public/index.php` and Site metadata. |
| Domain routing | Request with `Host: example.test` reaches PHP then Node and returns Installer. |
| Installer | Browser session starts and configuration persists. |
| Source and webhook | Source metadata persists; webhook is verified and runtime UUID/secret are stored. |
| First build | Dashboard submits through Scheduler and ends in Site state `RUNNING`. |
| Static website | Generated `public/dist/welcome/index.html` is fetched from PHP's static document root. |

## Local Verification

- Static/slice validation passed: `node --check` for the new runtime transport
  and E2E test, plus 11 relevant Runtime, Scheduler, and Build tests.
- Full E2E execution: **PASS**. It was run in the project's local Terminal,
  outside the restricted automation sandbox, with:

  ```text
  Runtime E2E provisions, proxies a domain, configures, builds, and serves a running Site
  pass 1
  fail 0
  ```

  Duration: `1063.786199ms` (test body: `299.022793ms`).

## Pass Criterion

This report's six checks are the E2E proof required by Commit 046. Commit 047
remains responsible for the final Sprint freeze.

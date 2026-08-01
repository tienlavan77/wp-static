# Sprint 10 Commit 013 - Shared Runtime Platform Provisioning

Status: PASS

## Goal

Turn the manual VPS Runtime setup into generated WPSC deployment artifacts while
keeping one shared Runtime process independent from any individual Site.

## Delivered

- Added `wpsc platform:provision`.
- Generates a reusable root `runtime.config.js` only when absent.
- Generates private `config/runtime.env` only when absent and applies mode 0600.
- Generates `deploy/systemd/wpsc-runtime.service` for the shared Node Runtime.
- Generates `deploy/nginx/<domain>.conf` for the supplied Site's public entry point.
- Generates `deploy/ACTIVATE_RUNTIME.md` with the explicit privileged activation
  commands. WPSC never attempts to execute `sudo` or `systemctl` itself.
- Resolves each registered Site's webhook callback host from the Runtime domain
  registry, so the shared Runtime does not send every Site callback to the first
  provisioned domain.
- Requires an existing Site before producing a Site virtual host, preventing a
  deployment file from pointing outside the Site Repository boundary.

## Usage

```bash
wpsc platform:provision \
  --project /srv/wpsc \
  --site tinsinhphat \
  --domain tinsinhphat.com \
  --runtime-origin http://127.0.0.1:8787
```

The generated Runtime configuration contains adapters and callback composition;
per-Site source, webhook, credentials, build output, and storage remain under
`sites/<siteId>/`.

## Boundary

This commit changes only product provisioning artifacts and CLI wiring. It does
not alter Runtime routing, Scheduler policy, Build lifecycle, or provider
contracts.

## Validation

```bash
node --test test/runtimePlatformProvisioning.test.js test/siteRuntimeCli.test.js
node framework/src/cli/index.js --help
git diff --check
```

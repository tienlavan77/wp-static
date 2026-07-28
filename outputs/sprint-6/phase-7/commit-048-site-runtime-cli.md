# Commit 048 - CLI Create And Serve Site Runtime

## Delivered

- `wpsc site:create --site <id> [--domain <domain>]` provisions a real Site
  Skeleton through Provisioning Service and records the optional domain mapping.
- `wpsc runtime:serve --config runtime.config.js [--port 8787]` loads injected
  runtime dependencies, creates Site Runtime composition, and exposes its HTTP
  transport.
- Added the runtime configuration contract and CLI tests.

## Boundary

CLI is operational glue only. It does not implement setup, source, webhook,
scheduler, or build workflow; those remain in their existing owners.

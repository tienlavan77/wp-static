# Commit 049 - Runtime Browser Views

## Delivered

- Site root `GET /` now serves Installer HTML for an unconfigured Site and
  Dashboard HTML for a configured Site.
- Browser documents use the existing Runtime REST endpoints for setup, Source,
  Webhook, and First Build actions.
- Runtime HTTP transport preserves HTML content type while API responses remain
  JSON.

## Boundary

Browser documents hold no workflow/state machine. They render server-provided
state and call Runtime Router endpoints; Setup Service, Scheduler, and Build
owners are unchanged.

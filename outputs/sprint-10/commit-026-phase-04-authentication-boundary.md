# Sprint 10 Commit 026 - Phase 4 Authentication Boundary

Status: PASS

## Scope

One combined HTTP fixture serves the WordPress REST and WooCommerce REST
surfaces under a single endpoint. The real `wordpress-woocommerce` Source
Adapter must use the credentials owned by its Runtime source configuration:

- WordPress requests: Application Password Basic authentication.
- WooCommerce requests: `consumer_key` and `consumer_secret` query
  authentication.

The fixture records each request and rejects either invalid authentication
scheme. This verifies the adapter boundary before Phase 5 connects it to the
Runtime webhook → Scheduler → Queue → Dispatcher → Build path.

Credential-leak scanning of generated Runtime storage and public artifacts is
part of the next Phase 4 sub-step, after the first full real Runtime build.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 4 combines authenticated WordPress and WooCommerce source reads
4 passed, 0 failed
```

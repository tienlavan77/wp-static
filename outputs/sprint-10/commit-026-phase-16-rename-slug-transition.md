# Sprint 10 Commit 026 - Phase 16 Rename / Slug Transition

Status: PASS

## Scope

The WooCommerce HTTP fixture renames Product A from `product-a` to
`product-a-new`. A signed Product update webhook carries both the prior and
new slugs, then Runtime executes the frozen full route-transition policy.

Acceptance:

- new Product HTML route exists with current content;
- route manifest contains only the new canonical Product route;
- old public path remains solely as the established browser redirect fallback
  to the new route (301 routing manifest rule), not as stale Product content;
- search, sitemap and dependency manifest contain the new identity only;
- telemetry records the required full route-transition reconciliation.

The browser fallback is intentional existing WPSC policy. This test does not
claim an HTTP redirect from a web server; it verifies the generated static
fallback and routing manifest that deployment serves.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 16 publishes a Product slug transition with the frozen browser redirect fallback (1415.902958ms)
16 passed, 0 failed
```

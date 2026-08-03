# Sprint 10 Commit 026 - Phase 09 Source Data Mutation

Status: PASS

## Scope

Product A is changed only in the WooCommerce HTTP fixture:

```text
name:  Product A → Product A Updated
price: 100 → 120
```

The real combined WordPress/WooCommerce Source Adapter receives a normal
Product change hint and fetches the updated provider response. The test
asserts the newly normalized title and price and verifies a WooCommerce HTTP
request occurred.

This phase does not invoke Scheduler; Phase 10 proves that the queued webhook
causes the Runtime to consume this changed source data.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 9 fetches changed Product data from the WooCommerce HTTP source (4.921118ms)
9 passed, 0 failed
```

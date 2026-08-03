# Sprint 10 Commit 026 - Incremental Build E2E and Performance Validation

Status: PASS

## Canonical Phase Register

This register is the authoritative C026 progress view. It is separate from the
capability checklist below, which may group evidence from several phases.

| Phase | Scope | Status |
| --- | --- | --- |
| 01 | Repository / Architecture Audit | PASS |
| 02 | WordPress REST Fixture | PASS |
| 03 | WooCommerce REST Fixture | PASS |
| 04 | Authentication Boundary | PASS |
| 05 | Runtime Full Build | PASS |
| 06 | Product Incremental Webhook | PASS |
| 07 | Dependency Snapshot | PASS |
| 08 | Product Webhook Job Lifecycle | PASS |
| 09 | Source Data Mutation | PASS |
| 10 | Scheduler Tick | PASS |
| 11 | Incremental Output Verification | PASS |
| 12 | `public/dist` Acceptance | PASS |
| 13 | Unaffected Route Verification | PASS |
| 14 | Runtime Mutation Matrix | PASS |
| 15 | Delete Safety | PASS |
| 16 | Rename / Slug Transition | PASS |
| 17 | Failure / Recovery | PASS |
| 18 | Performance Benchmark | PASS |
| 19 | Final Regression / Architecture Audit | PASS |

## Security Evidence

Credential HTTP authentication is PASS, but credential non-persistence in
public and Build-owned data is tracked independently in
`commit-026-security-evidence.md`; its Phase 05 E2E scan is PASS.

## Phase 1 - Isolated Runtime Workspace

PASS. `test/fixtures/runtime-wordpress-woocommerce/createRuntimeWorkspace.js`
creates a unique temporary workspace, Site Repository, Site ID, storage and
future `public/dist` root for each E2E test. It never uses the project
workspace or production Site directories.

## Phase 2 - WordPress REST Fixture

PASS. The real WordPress Runtime Source Adapter reads HTTP REST fixture data
using WordPress Application Password Basic authentication.

## Phase 3 - WooCommerce REST Fixture

PASS. The real WooCommerce Adapter reads fixture Product, category and
variation data through HTTP. The fixture verifies `consumer_key` and
`consumer_secret` on every request.

## Phase 4 - Combined Authentication Boundary

PASS. The real combined Source Adapter reads WordPress and WooCommerce data
from one endpoint. The fixture verifies Basic Application Password auth on
WordPress requests and CK/CS query authentication on WooCommerce requests.

## Phase 5 - Combined Runtime Full Build

PASS. An isolated Site Runtime persisted its WordPress/WooCommerce source
configuration and credentials, then published Product and category archive
output through Scheduler → Queue → Dispatcher → Build Integration → Runtime
Builder → Output Pipeline. The observed full fixture build duration was
approximately 2.5 seconds; it is evidence only, not yet a benchmark.

## E2E Matrix

- [x] Webhook burst: ten updates coalesce into one pending Job.
- [x] Repeated entities retain one latest entity entry; distinct entities remain.
- [x] Webhook during running Build retains one-active-Build-per-Site lock.
- [x] Post update publishes changed route through Runtime/WordPress E2E.
- [x] Duplicate webhook delivery is idempotent in Runtime/WordPress E2E.
- [x] Post delete removes stale route HTML and search entry through full reconciliation.
- [x] Post rename publishes the new route and keeps a browser redirect fallback at the old route.
- [x] Isolated WordPress and WooCommerce HTTP fixtures authenticate real adapters.
- [x] Combined `wordpress-woocommerce` Source Adapter authenticates both HTTP boundaries.
- [x] Initial combined Runtime full build publishes Product and category archive output.
- [x] Persisted dependency snapshot maps Product output to Product route, archive and Homepage.
- [x] Signed Product webhook completes the Runtime Job lifecycle through Scheduler, Queue and Dispatcher.
- [x] Changed Product source data is fetched from the WooCommerce HTTP boundary.
- [x] Scheduler tick claims and completes the changed Product webhook Job through Dispatcher and Build Integration.
- [x] Product webhook incrementally republishes Product, category archive and Homepage output.
- [x] Changed Product public HTML and C023 incremental telemetry are mutually consistent.
- [x] Published `public/dist` contains only current Product title/commerce prices and passes structural manifest acceptance.
- [x] Unrelated public route remains byte-stable and excluded from Product incremental changed routes.
- [x] Isolated Page, Post, Taxonomy and Media mutations publish through real Runtime paths; embedded Product is covered by Phase 11.
- [x] Destructive Product delete performs full reconciliation and removes stale route, search, sitemap and dependency data.
- [x] Product rename publishes canonical new route and static browser redirect fallback while reconciling derived artifacts.
- [x] Controlled source failure preserves the verified public snapshot; a subsequent webhook recovers through normal Runtime flow.
- [x] C023 benchmark evidence records full and Product/Page/Taxonomy incremental measurements without a fabricated performance claim.
- [x] Fixture credentials are absent from public and Build-owned persisted data.
- [ ] Product, Page/Post, Taxonomy, Delete, Rename, Media, Embedded Product.
- [ ] Duplicate webhook, Build failure, Runtime restart, retry.
- [ ] Full vs incremental benchmark on representative Site.

## Measurement Contract

Use C023 history for `duration`, mode, pages written, and changed routes. C026
will compare representative full and incremental builds, including source
requests and cache behavior when those measurements are available.

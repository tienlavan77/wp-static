# Sprint 10 Commit 026 - Phase 14 Runtime Mutation Matrix

Status: PASS

## Scope

Each scenario creates an independent temporary Site Runtime workspace and
performs an initial full publish before its mutation. The test then changes
only the HTTP fixture and invokes Runtime Webhook Receiver → Scheduler.
Each workspace and its HTTP fixture close before the next scenario begins.

| Scenario | Source boundary mutation | Published assertion |
| --- | --- | --- |
| Page | WordPress Page body | `/about` has new body |
| Post | WordPress Post title/body | `/news` has new title; route-data has new body |
| Taxonomy | WooCommerce category name | `/featured` has new category name |
| Media | Product image source URL | Product HTML references new image |
| Embedded Product | covered by Phase 11 | Homepage card updates with Product |

Delete and rename have destructive/route-transition safety requirements and
remain dedicated deep checks in Phase 15 and Phase 16. No scenario injects
normalized Content or calls Build Integration/Builder/Output Pipeline directly.

During implementation, the matrix exposed that the combined Runtime Source
Adapter was not requesting WordPress Media. The adapter now enables Media by
default, allowing the actual Media manifest and public assets to represent
Media mutations.

Validation executed outside the restricted test sandbox on 2026-08-02:

```text
✔ C026 Phase 14 runs Page, Post, Taxonomy and Media mutations through isolated Runtime scenarios (4936.11448ms)
14 passed, 0 failed
```

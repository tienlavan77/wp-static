# Sprint 7 Commit 002 - WordPress Content Contract

## Delivered

- Versioned WordPress provider document: `wpsc.wordpress-content` version 1.
- Normalized Page and Post content is the default reader scope.
- Normalized Category and Tag term data is the default collection scope.
- Stable author records with identifier, display name, slug, profile URL and
  avatar reference.
- Embedded WordPress author data is included in normalized content. A numeric
  `authorId` is retained for compatibility with prior content consumers.
- A `getContentContract()` provider method is available from both the
  WordPress adapter and the Runtime WordPress Source Adapter.

## Boundary

WordPress remains the canonical CMS for Pages, Posts, Taxonomies and Authors.
WPSC reads and normalizes that data for Shared Website Services and Builder;
it does not add local Page/Post/Media CRUD or replace WordPress Admin.

The contract excludes raw WordPress REST response objects. This makes Builder
and future services depend on the WPSC provider contract rather than on a
specific WordPress REST representation.

## Resilience

Some WordPress roles cannot call `/wp-json/wp/v2/users`. Author collection
retrieval therefore degrades to an empty collection by default, while embedded
author references on Pages and Posts continue to be available. Set
`strictAuthors: true` only where a complete author directory is mandatory.

## Validation

```bash
node --test test/wordpressAdapter.test.js test/wordpressSourceAdapter.test.js test/sourceAdapterContract.test.js
node --check framework/src/source/wordpressContentContract.js
git diff --check
```

The focused WordPress and source-contract checks pass. The broader
`wordpressWooCommerceAdapter` suite currently has one unrelated Layout
Normalization failure: the example project still references the moved
`examples/basic-shop/theme/layout.js` path.

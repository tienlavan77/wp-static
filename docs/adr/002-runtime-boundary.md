# ADR 002 - Runtime Boundary

Status: `Accepted for WPSC v1`

## Decision

WPSC public pages remain static. Runtime exists only for dynamic customer
workflows that cannot be safely or correctly represented as static HTML.

Runtime responsibilities include:

- auth
- account
- cart
- checkout
- order lookup
- server-side source service wrappers
- browser-safe frontend enhancement modules

Runtime must not become the renderer for public static routes.

## Context

The storefront must stay fast, cacheable, and deployable as flat static output.
At the same time, commerce requires dynamic actions such as login, session,
address update, checkout order creation, and order lookup.

These actions need server-side credentials and session protection. They cannot
be embedded into static HTML or browser JS.

## Alternatives Considered

### Make the entire storefront an SSR app

Rejected because it weakens the core static-commerce goal and makes simple
static hosting/CDN deployment harder.

### Put customer workflows directly in browser code

Rejected because WooCommerce keys, WordPress bridge secrets, and trusted user
identity must remain server-side.

### Keep static pages and add a runtime kernel for dynamic workflows

Accepted because it preserves static performance while giving commerce flows a
secure server-side boundary.

## Consequences

- Public HTML can be served by Nginx/CDN as static files.
- Runtime can run as a separate Node process or same-origin helper server.
- Browser code calls runtime endpoints and never receives private credentials.
- Runtime derives user identity from HTTP-only session, not browser-provided
  `userId`.
- Checkout/order/account flows depend on runtime availability.

## Links

- `docs/architecture-boundary.md`
- `docs/public-contracts.md`
- `docs/runtime-commerce-api.md`
- `docs/customer-auth-strategy.md`


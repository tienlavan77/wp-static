# Customer Auth Strategy

WPSC static core does not own customer login, sessions, cart, checkout, or account
data. Those workflows belong to a runtime API when a site needs them.

## Boundary

```text
Static WPSC build
  - public HTML
  - public catalog data
  - public SEO data
  - public assets

Runtime commerce API
  - customer login
  - customer session/cookie/JWT
  - cart
  - checkout
  - order lookup
  - account data
```

## Modes

### No Login

Use this for catalog sites, landing pages, brochure shops, and stores that send users
to an external checkout.

Tradeoff: fastest and simplest, but no customer account features.

### Headless WooCommerce

Use this when the static site needs cart, checkout, orders, and customer account data
from WooCommerce.

Rule: browser code talks to a WPSC runtime API, not directly to WooCommerce secrets.
The runtime API proxies WooCommerce securely from the server side.

### Custom Backend

Use this when the project needs custom users, custom pricing, custom order flows, or
non-WooCommerce commerce logic.

Rule: the custom backend owns authentication and exposes only safe frontend APIs.

## Token, Cookie, CORS, And CSRF Rules

- HTTP-only cookies are preferred for browser sessions.
- JWT signing secrets stay server-side only.
- WooCommerce consumer secrets stay server-side only.
- WordPress Application Passwords and Bearer tokens stay server-side only.
- CORS must allow only trusted origins.
- Mutating runtime endpoints need CSRF protection when cookie auth is used.
- Static output must never contain customer-specific private data.

## Forbidden Frontend Secrets

- `WPSC_WOO_CONSUMER_SECRET`
- `WPSC_WP_APP_PASSWORD`
- `WPSC_WP_BEARER_TOKEN`
- `JWT_SIGNING_SECRET`
- `SESSION_SECRET`

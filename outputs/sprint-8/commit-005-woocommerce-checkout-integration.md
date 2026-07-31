# Sprint 8 Commit 005 - WooCommerce Checkout Integration

Status: PASS

## Delivered

- Versioned immutable `wpsc.checkout` contract.
- Site-scoped Checkout identity backed by the Customer Session id.
- Customer, billing/shipping intent, payment selection and validation state.
- Normalized empty Cart, customer, payment, session and provider diagnostics.
- Runtime `GET /api/checkout` state endpoint and `POST /api/checkout` submission endpoint.
- WooCommerce submission through an injected provider boundary.
- Authoritative Cart items sourced from the server-side Customer Session.
- Submitted Checkout state contains the normalized provider order result.

## Authority Boundary

```text
Browser Checkout Input
  -> Site-scoped Checkout Service
  -> Server-side Cart Session
  -> Commerce Provider Boundary
  -> WooCommerce Order
```

The Browser cannot submit authoritative Product quantities by replacing the
`items` field. Checkout rebuilds provider line items from the Site-scoped Cart.
WooCommerce remains the authority for order creation, pricing, tax, stock and
payment processing.

## Diagnostics

Checkout errors use the shared diagnostics shape:

```text
code
message
severity
```

The namespace includes `checkout.cart.*`, `checkout.customer.*`,
`checkout.payment.*` and `checkout.provider.*`.

## Validation

```bash
node --test test/checkoutService.test.js test/cartService.test.js test/commerceRuntime.test.js test/customerIdentityRuntime.test.js test/siteCommerceGateway.test.js
node --check framework/src/runtime/checkout/createCheckoutService.js
node framework/src/cli/index.js --help
git diff --check
```

Focused Cart, Checkout, Customer Session, Site Gateway and Commerce Runtime
validation passed with 26 tests.

# Runtime Commerce API

WPSC static output stays public and cacheable. Customer workflows run through a
separate runtime API when the site needs login, cart, checkout, order, or account data.

## Service

```js
import { createCommerceServer } from "wpsc";

const { listen } = createCommerceServer({
  async checkoutProxy({ cart, payload, session }) {
    return {
      orderId: 1001,
      status: 201
    };
  },

  async orderLookup({ orderId, session }) {
    return {
      id: orderId,
      status: "processing"
    };
  }
});

listen(8787);
```

## Endpoints

- `GET /health`
- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/:productId`
- `POST /checkout`
- `GET /orders/:orderId`

## Session

The runtime uses an HTTP-only `wpsc_session` cookie. Static HTML should never embed
customer-specific data. Browser code talks to runtime endpoints, and the runtime talks
to WooCommerce or another backend from the server side.

## Deployment Notes

- Run the runtime API as a separate Node.js process.
- Keep WooCommerce keys, JWT signing keys, and session secrets in server env vars.
- Put the runtime behind HTTPS.
- Restrict CORS to trusted storefront origins.
- Add CSRF protection before enabling cookie-authenticated mutating endpoints in production.

# Runtime Commerce API

WPSC static output stays public and cacheable. Customer workflows run through a
separate runtime API when the site needs login, cart, checkout, order, or account data.

## Service

```js
import { createCommerceServer } from "wpsc";
import { createWooCommerceAccountService } from "wpsc";
import { createWordPressAuthService } from "wpsc";

const wpAuth = createWordPressAuthService({
  baseUrl: "https://api.example.com",
  bridgeSecret: process.env.WPSC_AUTH_BRIDGE_SECRET
});
const wooAccount = createWooCommerceAccountService({
  baseUrl: "https://api.example.com"
});

const { listen } = createCommerceServer({
  async authLogin({ credentials, session }) {
    return wpAuth.authLogin({ credentials, session });
  },

  async accountLookup({ userId, session }) {
    return wooAccount.accountLookup({ userId, session });
  },

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
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/account/me`
- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/:productId`
- `POST /checkout`
- `GET /orders/:orderId`

The runtime also accepts non-`/api` paths for older commerce endpoints, for example
`GET /cart`. Account/auth endpoints should be used through `/api/...` from the
static storefront.

## Session

The runtime uses an HTTP-only `wpsc_session` cookie. Static HTML should never embed
customer-specific data. Browser code talks to runtime endpoints, and the runtime talks
to WooCommerce or another backend from the server side.

After login, the runtime stores the authenticated user id in the server-side session.
Account endpoints must derive the current user from `session.user.id`, not from a
browser-provided `userId` query or request body. WooCommerce customer/order/address
requests should be made server-side and filtered by that session user id before any
data is returned to the browser.

## WooCommerce Account Data

`createWooCommerceAccountService()` can be used as the `accountLookup` handler after
the auth layer has placed the WordPress/WooCommerce customer id into the runtime
session:

```js
const wooAccount = createWooCommerceAccountService({
  baseUrl: process.env.WP_URL
});

createCommerceServer({
  accountLookup: wooAccount.accountLookup
});
```

The service calls WooCommerce server-side:

- `GET /wp-json/wc/v3/customers/{session.user.id}`
- `GET /wp-json/wc/v3/orders?customer={session.user.id}`

The browser never receives WooCommerce consumer credentials and never chooses the
customer id used for these requests.

## WordPress Login

`createWordPressAuthService()` delegates login to a server-side WordPress/API endpoint.
The default endpoint is:

```text
POST /wp-json/wpsc/v1/auth/login
```

Expected success response:

```json
{
  "user": {
    "id": 123,
    "email": "customer@example.com",
    "displayName": "Customer",
    "roles": ["customer"]
  }
}
```

Expected failed response:

```json
{
  "message": "Invalid credentials."
}
```

The service returns only normalized user identity to the WPSC runtime. It does not
send WordPress tokens, application passwords, or WooCommerce credentials to the
browser.

## Deployment Notes

- Run the runtime API as a separate Node.js process.
- Keep WooCommerce keys, JWT signing keys, and session secrets in server env vars.
- Put the runtime behind HTTPS.
- Restrict CORS to trusted storefront origins.
- Add CSRF protection before enabling cookie-authenticated mutating endpoints in production.

## Basic Shop Runtime Server

The Tin Sinh Phat example includes a same-origin runtime/static server:

```bash
npm run serve:runtime:example
```

It serves:

- static files from `examples/basic-shop/dist`
- `/api/*` through `createCommerceRuntime()`
- `/health` for runtime health checks

Local URL:

```text
http://localhost:8787
```

Environment file:

```text
examples/basic-shop/.env
```

Required values:

```text
WPSC_WP_URL=https://api.tinsinhphat.com
WPSC_AUTH_ENDPOINT=/wp-json/wpsc/v1/auth/login
WPSC_AUTH_BRIDGE_SECRET=...
WPSC_WOO_CONSUMER_KEY=...
WPSC_WOO_CONSUMER_SECRET=...
```

The static account UI can then call `/api/auth/login`, `/api/auth/logout`, and
`/api/account/me` on the same origin.

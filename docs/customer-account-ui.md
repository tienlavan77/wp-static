# Customer Account UI

The account UI helpers render server-side HTML for projects that enable the runtime
commerce API. Static catalog sites do not need to use these views.

## Views

- `renderLoginView()`
- `renderLogoutView()`
- `renderAccountDashboard(customer)`
- `renderOrderHistoryView(orders)`
- `renderAddressBookView(addresses)`

## Usage

```js
import { renderAccountDashboard } from "wpsc";

const html = renderAccountDashboard({
  email: "customer@example.com",
  name: "Customer"
});
```

## Boundary

These views do not authenticate customers by themselves. They render HTML around data
provided by the runtime API. Session, cookie, JWT, cart, checkout, order, and account
data remain runtime responsibilities.

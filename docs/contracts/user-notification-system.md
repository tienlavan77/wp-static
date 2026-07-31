# User Notification System

## Purpose

WPSC has two audiences for every failure:

- The customer or Site operator, who needs a clear explanation and next action.
- Runtime support, which needs the original machine-readable diagnostic and a safe reference.

The technical diagnostic is never replaced. Runtime HTTP responses append a
presentation object to every item in `diagnostics.errors` and
`diagnostics.warnings`.

```json
{
  "code": "checkout.provider.rejected",
  "detail": "woocommerce_rest_invalid_coupon",
  "message": "WooCommerce request failed: 400 Coupon does not exist.",
  "severity": "error",
  "presentation": {
    "title": "Mã ưu đãi không áp dụng được",
    "message": "Mã ưu đãi không hợp lệ, đã hết hạn hoặc không áp dụng cho đơn hàng này.",
    "action": "Xóa hoặc đổi mã ưu đãi",
    "actionId": "edit-coupon",
    "retryable": false,
    "reference": "woocommerce_rest_invalid_coupon"
  }
}
```

`message` and `code` remain the technical contract. `presentation` is the
user-facing contract. Browser code renders `presentation`; it must not infer
workflow decisions from an HTTP status or an adapter error string.

## Presentation Fields

| Field | Meaning |
| --- | --- |
| `title` | Short explanation shown as the error heading. |
| `message` | Plain-language explanation safe for a normal user. |
| `action` | The next action the user can take. |
| `actionId` | Stable UI action identifier (`retry`, `edit-cart`, `edit-coupon`, etc.). |
| `retryable` | Whether retrying without changing input is reasonable. |
| `reference` | Safe code support can request from the user; never a secret. |

## Failure Matrix

The following cases are expected product failures, not exceptional surprises.

| Journey | Technical examples | User result |
| --- | --- | --- |
| Domain/site | Site not mapped, site disabled, installer incomplete | Explain that the website is not ready and provide support/setup action. |
| Browser/network | Offline, DNS failure, API timeout, stale asset, blocked cookies | Explain connection/session issue; offer retry and preserve form/cart data. |
| Source setup | Missing endpoint, invalid URL, bad Application Password, expired credentials | Identify the field/connection step; never expose credentials. |
| WooCommerce setup | Optional Woo keys invalid, API permission denied, unsupported capability | Allow WordPress-only mode when Woo is optional; explain what feature is unavailable. |
| Webhook | Bridge disabled, wrong target, secret mismatch, unreachable Runtime, verification failure | Explain that content sync is not active; offer configuration/test action. |
| Product browsing | Missing route, product unpublished, stale product data, missing image | Keep page usable where possible; provide back-to-catalog action. |
| Search | Index unavailable, query too short, stale index | Explain that search is temporarily unavailable and offer browse fallback. |
| Cart | Empty cart, missing item, invalid quantity, stale provider ID, unavailable stock | Preserve valid items, identify the affected item, offer refresh/remove/reselect. |
| Variation | Required option not selected, variation removed, variation out of stock | Tell the user to select a valid configuration again. |
| Checkout input | Missing name/email/address/payment, invalid email, terms not accepted | Mark the relevant form fields; do not submit to provider. |
| Coupon | Invalid, expired, restricted, already used, stale browser coupon | Explain coupon failure and provide remove/change action; never fail silently. |
| Payment | Gateway unavailable, unsupported method, provider rejection | Explain method availability and keep cart/order form intact. |
| Order provider | Provider timeout, permission failure, malformed order, duplicate submission | Show safe reason/reference; prevent duplicate retry while request is pending. |
| Account | Invalid login, expired session, account lookup failure, forbidden update | Explain login/session action and preserve non-secret form input. |
| Forms | Missing form definition, validation failure, provider timeout | Identify fields, preserve input, offer retry. |
| Build/publish | Source unavailable, build failed, queue active, output write failure | Explain that the previous published site remains; offer retry/status action. |

## Safety Rules

- Never show Application Passwords, consumer secrets, bridge secrets, cookies,
  filesystem paths, stack traces, or raw request URLs to a customer.
- Preserve the original `code`, `detail`, and `message` for logs and support.
- Do not turn every failure into "try again". Validation and stale data need a
  corrective action instead of a blind retry.
- Keep cart and form input when an order fails.
- Make retries idempotent or disable the submit control while a request is in
  flight.
- Use the same presentation contract in Browser, Dashboard, and future CLI
  presentation layers; only the layout may differ.

## Implementation Boundary

`framework/src/shared/diagnostics/createUserDiagnosticPresentation.js` owns the
catalog and safe fallback. `framework/src/runtime/api/runtimeResponse.js`
attaches presentation metadata at the HTTP boundary. Services continue to own
business diagnostics; Browser only renders the resulting presentation.

When adding a new diagnostic code, the implementation must either add a
catalog entry or intentionally use the safe fallback. A new screen must not
invent a second error shape.

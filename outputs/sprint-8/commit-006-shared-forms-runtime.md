# Sprint 8 Commit 006 - Shared Forms Runtime

Status: PASS

## Delivered

- Versioned immutable `wpsc.form` contract.
- Provider-backed form definition and submission boundaries.
- Shared field normalization and required/email validation.
- Normalized validation, definition and provider diagnostics.
- Site-scoped submission context with optional Session and Customer identity.
- Thin Runtime API: `GET /api/forms/:formId` and `POST /api/forms/:formId`.
- Normalized form state suitable for direct Theme consumption.

## Boundary

```text
Theme / Browser
  -> Runtime Forms Gateway
  -> Shared Forms Service
  -> Form Definition / Submission Provider
```

The Forms Service never writes Site filesystem state. It does not include a
form editor, persistence implementation or provider-specific UI. Providers own
definition storage and delivery; the Service owns contract normalization,
validation and the Site Context boundary.

## Validation

```bash
node --test test/formsService.test.js test/checkoutService.test.js test/cartService.test.js test/commerceRuntime.test.js test/customerIdentityRuntime.test.js test/siteContext.test.js
node --check framework/src/forms/createFormsService.js
node --check framework/src/runtime/forms/handleFormRoutes.js
git diff --check
```

Focused Forms, Checkout, Cart, Runtime, Customer Session and Site Context
validation passed with 32 tests.

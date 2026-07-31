# Sprint 8 Commit 003 - Customer Identity and Account Runtime

Status: PASS

## Delivered

- Immutable `wpsc.customer-identity` version 1 contract.
- Site-scoped `wpsc.customer-session` version 1 metadata.
- Runtime Login creates a normalized Customer Identity while retaining the
  compatible `user` response.
- Account responses expose normalized Identity, Profile, Address and Order
  references.
- Site Commerce Gateway supplies the route-owned Site id to each Commerce
  Runtime.
- A customer cookie created by Site A cannot resolve a session in Site B.
- Shared Rendering Context can expose normalized Account state to Theme
  without exposing Auth services, credentials or provider clients.

## Ownership

```text
Browser
  -> Site Runtime Account API
  -> WordPress Identity Bridge
  -> WooCommerce Customer / Orders
```

WordPress/WooCommerce remain Customer and Order authority. WPSC owns only the
Site-scoped Runtime session and normalized presentation contract. Passwords
are forwarded for authentication and are never persisted in Customer Identity
or Customer Session state.

## Session Isolation

```text
Site A Customer Session != Site B Customer Session
```

Each Site Commerce Runtime has an independent Session Store carrying explicit
Site identity. Unknown or cross-Site session ids create a new anonymous
session instead of reusing customer state.

## Validation

```bash
node --test test/customerIdentityRuntime.test.js test/commerceRuntime.test.js test/siteCommerceGateway.test.js
npm test
node framework/src/cli/index.js --help
git diff --check
```

Repository result:

```text
tests    421
pass     421
fail     0
skipped  0
```

# WPSC Bridge Plugin Consolidation

## Status

Deferred until the Account route is complete and verified against the existing
WordPress Auth Bridge and Webhook Bridge plugins.

## Goal

Package WPSC WordPress integration as one plugin that users install and activate
once, while preserving separate Webhook and Auth module boundaries internally.

```text
WPSC Bridge
├── Webhook module
├── Auth module
└── Mail module
```

## Why

The current installation has two independent plugins:

```text
wpsc-webhook-bridge
wpsc-auth-bridge
```

They create unnecessary installation and activation steps for a Site owner.
The unified plugin must improve deployment ergonomics without coupling webhook
workflow logic to customer authentication logic.

## Stable Public Endpoints

The consolidation must retain these endpoint paths exactly:

```text
/wp-json/wpsc/v1/webhook/status
/wp-json/wpsc/v1/webhook/test
/wp-json/wpsc/v1/webhook/config

/wp-json/wpsc/v1/auth/login
/wp-json/wpsc/v1/auth/register
/wp-json/wpsc/v1/auth/lost-password
/wp-json/wpsc/v1/auth/reset-password
/wp-json/wpsc/v1/auth/change-password
/wp-json/wpsc/v1/auth/verify-email
/wp-json/wpsc/v1/auth/resend-verification
```

Runtime must not need an API migration when the plugin is consolidated.

## Security Boundary

Webhook and Auth remain different trust boundaries and must use separate
secrets:

```php
WPSC_WEBHOOK_SECRET      // WordPress -> Runtime build trigger
WPSC_AUTH_BRIDGE_SECRET  // Runtime -> WordPress customer auth bridge
```

They must never be merged into a shared secret. Neither secret is exposed to a
browser, WooCommerce consumer key, or WordPress Application Password.

## Migration Plan

1. Create `wpsc-bridge` with separate internal Webhook, Auth, and Mail modules.
2. Preserve current REST endpoint paths, WordPress options, user-meta keys, and
   webhook payload format.
3. Test existing Runtime webhook registration and Account auth against the new
   plugin before replacing any installed plugin.
4. Install and activate `wpsc-bridge` on a test WordPress Site.
5. Deactivate the two legacy plugins only after webhook verification and Account
   login/register/reset flows pass.
6. Remove legacy plugin folders only after a successful production migration.

## Non Goals

- Do not change Runtime REST paths.
- Do not change Site credential storage.
- Do not change Scheduler, Build Engine, or Webhook changed-hint contract.
- Do not migrate this plugin before the Account route has passed end-to-end
  validation.
